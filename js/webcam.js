/**
 * Created by Pro on 2017/6/16.
 */

//我们从摄像机获取的图像数据就存放于video#webcam
var webcam = document.getElementById('webcam');
//画出我们的摄像机图像
var videoCanvas = document.getElementById('videoCanvas');
var videoContext = videoCanvas.getContext('2d');

//专门用于画出按钮（播放和暂停）
var layer2Canvas = document.getElementById('layer2');
var layer2Context = layer2Canvas.getContext('2d');

var blendCanvas = document.getElementById('blendCanvas');
//这里主要是用于缓冲，储存上一个视频图像与下一个视频图像之间的变化
var blendContext = blendCanvas.getContext('2d');

//这里是加入我们的两个按钮（分别都是图片）
var buttons = [];

var button1 = new Image();
button1.src ="img/play.png";
var buttonData2 = { name:"play", image:button1, x:320 - 64 - 20, y:10, w:32, h:32 };
buttons.push( buttonData2 );

var button2 = new Image();
button2.src ="img/pause.png";
var buttonData3 = { name:"pause", image:button2, x:320 - 32 - 10, y:10, w:32, h:32 };
buttons.push( buttonData3 );

// 这里能将视频反转，缺一不可，是一个搭配
videoContext.translate(320, 0);
videoContext.scale(-1, 1);

// 设置背景颜色，如果没有视频输出显示该颜色
videoContext.fillStyle = '#005337';
videoContext.fillRect( 0, 0, videoCanvas.width, videoCanvas.height );

var lastImage;
/**
 * 功能：主要是拿我们当前的canvas#videoCanvas上下文中的图像数据，与我们上次的数据lastImage作比较
 * 然后将我们比较后的数据的结果放入canvas#blendCanvas的上下文，当我们调用checkUpdate(func)
 * 就能调用canvas#blendCanvas的上下文的数据做判断是否按钮区域的rgb是否变化然后调用func
 */
function blender() {
    var width = videoCanvas.width;
    var height = videoCanvas.height;

    //获取摄像机视频中的图像资源信息，包括了rgba，是一个数组，数组大小是像素的4倍（rgba）
    //r = temp[0]; g = temp[1]; b = temp[2]; a = temp[3];
    var source = videoContext.getImageData(0, 0, width, height);
    //创建一个跟视频cavas一样大小的图像数据区
    var blend = videoContext.createImageData(width, height);
    //如果没有上次的数据则置入本次的图像数据
    if (!lastImage)lastImage = videoContext.getImageData(0, 0, width, height);
    //判断我们rgb的值有没有变化
    differenceAccuracy(blend.data, source.data, lastImage.data);
    //将我们判断后的数据blend放入blendCanvas上下文
    blendContext.putImageData(blend, 0, 0);
    //将我们上次的数据置为本次
    lastImage = source;

    /**
     * 混合源rgb值和前rgb值，得到当前像素点是否发生改变 改变用1表示，不改变用0表示
     * @param targetData 转换的目标rgba数组
     * @param sourceData 源，即当前的视频图像rgba数组
     * @param lastData 上一个图像数组
     */
    function differenceAccuracy(targetData, sourceData, lastData) {
        if (sourceData.length !== lastData.length) return null;
        var i = 0;
        //这里sourceData.length * 0.25只是获取图像的1/4
        //这里用一维数组获取数据是因为整个图像rbga二维值都使用一维数组
        while (i < (sourceData.length * 0.25))
        {
            //这里每隔4个像素点获取一个像素rgba值
            var average1 = (sourceData[4*i] + sourceData[4*i+1] + sourceData[4*i+2]) / 3;
            var average2 = (lastData[4*i] + lastData[4*i+1] + lastData[4*i+2]) / 3;
            //算出我们的上一个和当前的图像数据的值是否超过一个规定的值（可以理解为对变化的敏感度）
            //如果是则将diff置为0xFF，否0
            var diff = threshold(Math.abs(average1 - average2));

            //将算出的值放入targetData
            targetData[4*i]   = diff;
            targetData[4*i+1] = diff;
            targetData[4*i+2] = diff;
            targetData[4*i+3] = 0xFF;
            ++i;
        }

        function threshold(value)
        {
            return (value > 0x15) ? 0xFF : 0;
        }
    }
}

function renderWebcam() {
    if ( webcam.readyState === webcam.HAVE_ENOUGH_DATA ){
        //将我们video#webcam的图像数据使用videoCanvas画出来
        videoContext.drawImage(webcam, 0, 0, videoCanvas.width, videoCanvas.height);
        //画出我们的图片按钮播放和暂停
        for ( var i = 0; i < buttons.length; i++ )
            layer2Context.drawImage( buttons[i].image, buttons[i].x, buttons[i].y, buttons[i].w, buttons[i].h );
    }
}

/**
 * 判断canvas#blendCanvas的上下文数据总体上是否变化，如果是则调用func
 * @param func 回调
 */
function checkUpdate(func) {
    //我们这里是循环按钮的个数，我们这里有两个按钮，有可能两个按钮都有变化
    for (var i = 0; i < buttons.length; i++){
        var data = blendContext.getImageData(buttons[i].x, buttons[i].y, buttons[i].w, buttons[i].h).data;
        //储存当前区域的countPixels数量的rgb相加的总值
        var sum = 0;
        //countPixels是我们区域中所有的像素点的1/4
        var countPixels = data.length * 0.25;
        for (var j = 0; j < countPixels; j++){
            //因为我们countPixels所有的像素点的1/4，所以每一次需要*4
            sum += data[4*j] + data[4*j+1] + data[4*j+2];
        }
        //做出平均值
        var average = Math.round((sum / (3 * countPixels)));
        //如果平均值大于某个值则判断为变化了，就调用func将我们按钮区域的名字传过去
        if (average > 50){
            func(buttons[i].name);
        }
    }
}
