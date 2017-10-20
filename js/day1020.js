/**
 * Created by Pro on 2017-10-20.
 */
// http://stemkoski.github.io/

var WALL_LENGTH = 800;
var TV_WIDTH = 150;
var TV_HEIGHT = 80;
var SKYBOX_HEIGHT = 0;


var camera, scene, renderer, container;
var controls, stats, video, texture;
var isPlayTv = false;
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
    renderer.setPixelRatio(window.devicePixelRatio);
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

    if (isPlayTv && video.readyState === video.HAVE_ENOUGH_DATA) {
        if (texture) texture.needsUpdate = true;
        // video.play();
    }
    //将我们的摄像头的图像和按钮图片分别放入两层canvas中
    renderWebcam();

    blender();
    checkUpdate(function (msg) {
        if (msg === 'play') {
            isPlayTv = true;
            video.play();
        } else {
            isPlayTv = false;
            video.pause();
        }
    });
    //渲染
    renderer.render(scene, camera);
    //fps状态更新
    stats.update();
    //重新调用arimate
    requestAnimationFrame(arimate);
}


/**
 * 绘制场景
 */
function paint() {

    paintFloor();
    paintTV();

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
        var tvScreenGeometry = new THREE.PlaneGeometry(TV_WIDTH, TV_HEIGHT);
        //将视频纹理加入
        var tvScreenMaterial = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
        var tvScreen = new THREE.Mesh(tvScreenGeometry, tvScreenMaterial);
        tvScreen.position.y = 30;
        tvScreen.position.z = 0;
        scene.add(tvScreen);
    }

}


/**
 * 创建天空盒
 */
function createSky() {
    //这部分是给出图片的位置及图片名
    var imagePrefix = "img/sky/dawnmountain-";
    var directions = ["xpos", "xneg", "ypos", "yneg", "zpos", "zneg"];
    var imageSuffix = ".png";

    //创建一个立方体并且设置大小
    var skyGeometry = new THREE.CubeGeometry(5000, 5000, 5000);
    //这里是用于天空盒六个面储存多个材质的数组
    var materialArray = [];
    //循环将图片加载出来变成纹理之后将这个物体加入数组中
    for (var i = 0; i < 6; i++)
        materialArray.push(new THREE.MeshBasicMaterial({
            //这里imagePrefix + directions[i] + imageSuffix 就是将图片路径弄出来
            map: THREE.ImageUtils.loadTexture(imagePrefix + directions[i] + imageSuffix),
            side: THREE.BackSide  //因为这里我们的场景是在天空盒的里面，所以这里设置为背面应用该材质
        }));
    //MultiMaterial可以将MeshBasicMaterial多个加载然后直接通过Mesh生成物体
    var skyMaterial = new THREE.MultiMaterial(materialArray);
    //加入形状skyGeometry和材质MultiMaterial
    var sky = new THREE.Mesh(skyGeometry, skyMaterial);
    //设置天空盒的高度
    sky.position.y = SKYBOX_HEIGHT;
    //场景当中加入天空盒
    scene.add(sky);
}