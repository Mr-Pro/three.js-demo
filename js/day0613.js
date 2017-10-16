/**
 * WebGL day0613
 * Created by Pro on 2017/6/13.
 */

var WALL_POSITION_Y = 150;
var WALL_HEIGHT = 355;
var WALL_WIDTH = 10;
var WALL_LENGTH = 800;
var TV_WIDTH = WALL_LENGTH / 4;
var TV_HEIGHT = WALL_HEIGHT / 3;
var TV_THICKNESS = 5;
var SKYBOX_HEIGHT = 0;
var MIRROR_WIDTH = 70;
var MIRROR_HEIGHT = 150;


var camera, scene, renderer, container;
var material, controls, stats, video, texture, object;
var verticalMirrorMesh;
var mirror;

var threeStart = function () {

    //判断浏览器是否支持webGL
    if (!Detector.webgl) Detector.addGetWebGLMessage();
    //窗口尺寸改变事件
    window.addEventListener('resize', onWindowResize, false);

    /**
     * 窗口监听，用于改变窗口时能够实时保持窗口的比例
     */
    function onWindowResize() {
        //重新设置相机宽高比
        camera.aspect = window.innerWidth / window.innerHeight;
        //更新相机的投影矩阵，这里没有理解什么意思，我把它理解为更新相机里面的各种参数
        camera.updateProjectionMatrix();
        //重新设置
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    initRenderer();
    initScene();
    initCamera();
    //加入灯光
    initLight();
    //这里是绘制TV、墙壁、镜子、地板
    paint();
    createSky();
    //导入模型
    initObj();
    //回调重复渲染
    arimate();
};


/**
 * 初始化渲染器、添加fps监听器
 */
function initRenderer() {
    container = document.getElementById('webgl');
    document.body.appendChild(container);
    renderer = new THREE.WebGLRenderer({
        antialias: true//抗锯齿，尽可能的避免画出的形状出现锯齿状
    });
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);
    //fps侦测器
    stats = new Stats();
    stats.domElement.style.top = 'auto';
    stats.domElement.style.bottom = '0';
    container.appendChild(stats.dom);
}


/**
 * 初始化相机、鼠标键盘控制器
 */
function initCamera() {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 250;
    camera.position.y = 50;
    camera.lookAt(scene.position);

    //鼠标键盘控制器
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    // 限制水平线上的可视角度
    // controls.minAzimuthAngle = -1;
    // controls.maxAzimuthAngle = 1;
    controls.target.set(scene.position.x, scene.position.y, scene.position.z);
}

/**
 * 初始化场景
 */
function initScene() {
    scene = new THREE.Scene();
}

/**
 * 初始化灯光
 */
function initLight() {
    //环境光，没有方向，任意方向的发射光线
    var ambient = new THREE.AmbientLight();
    //环境光强度
    ambient.intensity = .8;
    //场景加入环境光
    scene.add(ambient);
    //方向光，颜色十六进制表示 0xffeedd
    var directionalLight = new THREE.DirectionalLight(0xffeedd);
    //设置方向光的来源点
    directionalLight.position.set(0, 10, 10).normalize();
    scene.add(directionalLight);
}

/**
 * 回调函数，重画整个场景
 */
function arimate() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        //设置我们的纹理需要更新 这里的纹理就是视频纹理
        //其实更新的就是将视频播放的画面重新截取到纹理，一帧一帧我们看起来就是动画
        if (texture) texture.needsUpdate = true;
       video.play();
    }
    //镜子也需要渲染，它相当于摄像机从这个3d世界看到的渲染到平面（镜子）
    mirror.renderWithMirror(new THREE.Mirror(renderer, camera));
    //渲染
    renderer.render(scene, camera);
    //fps状态更新
    stats.update();
    //重新调用arimate
    requestAnimationFrame(arimate);
}

/**
 * 初始化模型
 */

function initObj() {
    //这里我们是用max导出的obj模型包含材质
    //这里是直接官网的例子
    // THREE.Loader.Handlers.add(/\.dds$/i, new THREE.DDSLoader());
    //材质加载器
    var mtlLoader = new THREE.MTLLoader();
    //设置路径
    mtlLoader.setPath('./model/');
    //导入材质
    mtlLoader.load('room.mtl', function (materials) {
        //材质导入调用这个回调函数（钩子函数）
        // materials.preload();
        //obj模型加载器
        var objLoader = new THREE.OBJLoader();
        //设置将传入材质参数
        objLoader.setMaterials(materials);
        //设置路径
        objLoader.setPath('./model/');
        //导入模型时可以加入执行信息和错误信息的函数，这里我没有加入
        //onProgress, onError
        //导入模型
        objLoader.load('room.obj', function (object) {
            //将导入的模型旋转到合适的位置
            object.rotation.y = Math.PI;
            scene.add(object);
        });

    });
}


/**
 * 绘制场景
 */
function paint() {

    paintFloor();
    paintMirror();
    paintWall();
    paintTV();

    function paintWall() {

        //图片加载器，加载成纹理
        var loader = new THREE.TextureLoader;
        var wallOutside = loader.load('img/wall-outside.jpg');
        var wallInside = loader.load('img/wall-inside.jpg');
        //设置纹理的过滤方式
        wallInside.wrapT = wallInside.wrapS = THREE.RepeatWrapping;
        wallInside.repeat = new THREE.Vector2(5, 5);

        //材质
        var materials = [];
        materials.push(new THREE.MeshBasicMaterial()); //默认的材质，没有纹理
        materials.push(new THREE.MeshBasicMaterial());
        materials.push(new THREE.MeshBasicMaterial());
        materials.push(new THREE.MeshBasicMaterial());
        //这里设置了两种不同图片生成的纹理，墙外的和墙内的
        materials.push(new THREE.MeshBasicMaterial({map: wallOutside, side: THREE.DoubleSide}));
        materials.push(new THREE.MeshBasicMaterial({map: wallInside, side: THREE.DoubleSide}));
        //这6个基础材质的数组作为参数传递给MeshFaceMaterial
        var faceMaterial = new THREE.MultiMaterial(materials);

        //创建其中一面墙，然后其他的由此面墙生成
        var Geometry = new THREE.BoxGeometry(WALL_LENGTH, WALL_HEIGHT, WALL_WIDTH);
        //设置墙的位置参数
        var wallFront = new THREE.Mesh(Geometry, faceMaterial);
        wallFront.position.y = WALL_POSITION_Y;

        //通过clone函数可以得到一个全新的面，然后通过位置的改变作为其他墙面
        var wallLeft = wallFront.clone();
        wallLeft.rotation.y = 3 * Math.PI / 2;
        wallLeft.position.x = -WALL_LENGTH / 2;
        wallLeft.width = WALL_LENGTH + 100;

        var wallRight = wallFront.clone();
        wallRight.rotation.y = Math.PI / 2;
        wallRight.position.x = WALL_LENGTH / 2;

        var wallBack = wallFront.clone();
        wallBack.rotation.y = Math.PI;
        wallBack.position.z = -WALL_LENGTH / 2;

        wallFront.position.z = WALL_LENGTH / 2;
        scene.add(wallFront);
        scene.add(wallLeft);
        scene.add(wallRight);
        scene.add(wallBack);
    }

    function paintFloor() {
        var loader = new THREE.TextureLoader;
        loader.load('img/floor.jpg', function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping; //这里设置x和y超过了图片的像素之后进行的是重复绘制图片操作
            texture.repeat = new THREE.Vector2(5, 5); //设置图片重复绘制的密度这里是5*5
            //设置材质是双面应用该图片材质
            var floorMaterial = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
            //地板使用PlaneGeometry生成平面
            var floorGeometry = new THREE.PlaneGeometry(WALL_LENGTH, WALL_LENGTH);
            //生成地板的模型
            var floor = new THREE.Mesh(floorGeometry, floorMaterial);
            //设置地板的位置
            floor.position.y = -27;
            floor.rotation.x = Math.PI / 2;
            scene.add(floor);//场景加载该地板
        });
    }

    function paintTV() {

        //获取我们的视频的元素
        video = document.getElementById('video');
        //将我们的视频加载为纹理（播放时的每一帧都可以将它看作图片）
        texture = new THREE.Texture(video);

        //这里是屏幕
        var tvScreenGeometry = new THREE.PlaneGeometry(TV_WIDTH - 2, TV_HEIGHT - 4);
        //将视频纹理加入
        var tvScreenMaterial = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
        var tvScreen = new THREE.Mesh(tvScreenGeometry, tvScreenMaterial);
        tvScreen.position.y = WALL_HEIGHT / 3 + 1;
        tvScreen.position.z = -WALL_LENGTH / 2 + 8;

        //这里是屏幕后面的盒子
        var loader = new THREE.TextureLoader();
        var tvGeometry = new THREE.BoxGeometry(TV_WIDTH, TV_HEIGHT, TV_THICKNESS);
        var tvMaterial = new THREE.MeshBasicMaterial({map: loader.load('img/tv.jpg')});

        var tv = new THREE.Mesh(tvGeometry, tvMaterial);
        tv.position.y = WALL_HEIGHT / 3;
        tv.position.z = -WALL_LENGTH / 2 + TV_THICKNESS;

        scene.add(tvScreen);
        scene.add(tv);
    }

    function paintMirror() {
        //这里是背面的盒子
        var Geometry = new THREE.BoxGeometry(MIRROR_WIDTH + 3, MIRROR_HEIGHT + 3, 5);
        var Material = new THREE.MeshBasicMaterial({color:0x000, side: THREE.DoubleSide});
        var Mesh = new THREE.Mesh(Geometry, Material);
        //确定位置
        Mesh.position.y = 50;
        Mesh.position.z = -220;
        Mesh.position.x = -395;
        Mesh.rotateY(Math.PI / 2);
        scene.add(Mesh);

        //three.js有一个Mirror.js用于生成镜子的，这是我在官方的示例看的
        //这里有些代码不是很理解，都是直接使用官方给出的，不过按照我的理解
        //主要是给它一个渲染器和照相机，它将3d世界看到的重新渲染一遍，但是需要不断渲染，所以在回调函数中需要更新
        mirror = new THREE.Mirror( renderer, camera);
        verticalMirrorMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry(MIRROR_WIDTH, MIRROR_HEIGHT), mirror.material );
        verticalMirrorMesh.add( mirror );
        //设置镜片位置
        verticalMirrorMesh.position.y = 50;
        verticalMirrorMesh.position.z = -220;
        verticalMirrorMesh.position.x = -391;
        verticalMirrorMesh.rotateY(Math.PI / 2);
        scene.add( verticalMirrorMesh );
    }

}


/**
 * 创建天空盒
 */
function createSky() {
    //这部分是给出图片的位置及图片名
    var imagePrefix = "img/sky/dawnmountain-";
    var directions  = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
    var imageSuffix = ".png";

    //创建一个立方体并且设置大小
    var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );
    //这里是用于天空盒六个面储存多个材质的数组
    var materialArray = [];
    //循环将图片加载出来变成纹理之后将这个物体加入数组中
    for (var i = 0; i < 6; i++)
        materialArray.push( new THREE.MeshBasicMaterial({
            //这里imagePrefix + directions[i] + imageSuffix 就是将图片路径弄出来
            map: THREE.ImageUtils.loadTexture( imagePrefix + directions[i] + imageSuffix ),
            side: THREE.BackSide  //因为这里我们的场景是在天空盒的里面，所以这里设置为背面应用该材质
        }));

    //MultiMaterial可以将MeshBasicMaterial多个加载然后直接通过Mesh生成物体
    var skyMaterial = new THREE.MultiMaterial( materialArray );
    //加入形状skyGeometry和材质MultiMaterial
    var sky = new THREE.Mesh( skyGeometry, skyMaterial );
    //设置天空盒的高度
    sky.position.y = SKYBOX_HEIGHT;
    //场景当中加入天空盒
    scene.add( sky );
}