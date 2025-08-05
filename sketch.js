let resetButton;
let engine, world, render, runner;
let ball, ballTrail = [];
let generatedBallsCount = 0;
let maxBalls = 500;
let countDisplay;
let camera = { y: 0, smoothFollow: true }; // 摄像机位置和平滑跟随开关
let hasTriggeredFullscreen = false; // 跟踪是否已经触发过全屏
let backgroundImage; // 添加背景图片变量

var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Composites = Matter.Composites,
    Common = Matter.Common,
    Constraint = Matter.Constraint,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse,
    Composite = Matter.Composite,
    Events = Matter.Events,
    Bodies = Matter.Bodies,
    Vector = Matter.Vector,
    Bounds = Matter.Bounds,
    Body = Matter.Body;

// 预加载背景图片
function preload() {
    try {
        backgroundImage = loadImage('backgroundTest.png', 
            function(img) {
                console.log('背景图片加载成功:', img.width + 'x' + img.height);
                createNativeImage(img);
            },
            function() {
                console.error('背景图片加载失败，请确保 backgroundTest.png 文件在正确的路径');
                backgroundImage = null;
            }
        );
    } catch (error) {
        console.error('加载背景图片时出错:', error);
        backgroundImage = null;
    }
}

function createNativeImage(p5Image) {
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = p5Image.width;
    tempCanvas.height = p5Image.height;
    var tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(p5Image.canvas, 0, 0);
    window.nativeBackgroundImage = new Image();
    window.nativeBackgroundImage.onload = function() {
        console.log('原生背景图片创建成功');
    };
    window.nativeBackgroundImage.src = tempCanvas.toDataURL();
}

function setup() {
    const canvas = createCanvas(1280, 1920);
    canvas.style('margin', '0 auto');
    canvas.style('max-width', '100vw');
    canvas.style('max-height', '100vh');
    canvas.style('object-fit', 'contain');
    noLoop();

        resetButton = createButton('Reset Ball');
    resetButton.position(10, 10); // 移到左上角
    resetButton.style('background-color', '#ffcc00');
    resetButton.style('color', '#E52929');
    resetButton.style('padding', '10px');
    resetButton.style('z-index', '1000');
    resetButton.mousePressed(resetBall);
    
    // 添加全屏按钮
    let fullscreenButton = createButton('Fullscreen');
    fullscreenButton.position(10, 60); // 在重置按钮下方
    fullscreenButton.style('background-color', '#2ecc71');
    fullscreenButton.style('color', 'white');
    fullscreenButton.style('padding', '10px');
    fullscreenButton.style('z-index', '1000');
    fullscreenButton.mousePressed(toggleFullscreen);
    
    // 显示全屏提示
    showFullscreenHint();
    
    // 添加全屏样式监听
    setupFullscreenStyles();
    
    // 初始调整画布适应窗口大小
    setTimeout(() => {
        adjustCanvasForWindow();
    }, 100);
    
    // Initialize Matter.js after canvas is created
    initializeMatterJS();
}

function setupFullscreenStyles() {
    // 添加CSS样式来处理全屏模式（与现有style.css兼容）
    const style = document.createElement('style');
    style.textContent = `
        /* 保持与现有style.css的兼容性 */
        
        /* 普通模式下确保画布居中 */
        canvas {
            display: block !important;
            margin: 0 auto !important;
        }
        
        /* 全屏模式下的样式 */
        body:-webkit-full-screen {
            background: #000 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        body:-moz-full-screen {
            background: #000 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        body:fullscreen {
            background: #000 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* 全屏时UI元素的样式 */
        body:fullscreen button,
        body:-webkit-full-screen button,
        body:-moz-full-screen button {
            position: fixed !important;
            z-index: 9999 !important;
        }
        
        body:fullscreen div,
        body:-webkit-full-screen div,
        body:-moz-full-screen div {
            position: fixed !important;
            z-index: 9999 !important;
        }
    `;
    document.head.appendChild(style);
}

function showFullscreenHint() {
    // 创建全屏提示
    let hint = document.createElement('div');
    hint.style.position = 'fixed';
    hint.style.top = '50%';
    hint.style.left = '50%';
    hint.style.transform = 'translate(-50%, -50%)';
    hint.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    hint.style.color = 'white';
    hint.style.padding = '20px';
    hint.style.borderRadius = '10px';
    hint.style.fontSize = '18px';
    hint.style.textAlign = 'center';
    hint.style.zIndex = '9999';
    hint.innerHTML = '点击 "Fullscreen" 按钮或点击游戏区域进入全屏模式<br><small>按 ESC 键退出全屏</small>';
    hint.id = 'fullscreen-hint';
    document.body.appendChild(hint);
    
    // 3秒后自动隐藏提示
    setTimeout(() => {
        let hintElement = document.getElementById('fullscreen-hint');
        if (hintElement) {
            hintElement.remove();
        }
    }, 3000);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        // 进入全屏
        document.documentElement.requestFullscreen().then(() => {
            console.log('已进入全屏模式');
            hasTriggeredFullscreen = true;
            
            // 延迟调整画布，确保全屏模式完全激活
            setTimeout(() => {
                adjustCanvasForFullscreen();
            }, 200);
            
            // 隐藏提示
            let hint = document.getElementById('fullscreen-hint');
            if (hint) hint.remove();
        }).catch(err => {
            console.error('无法进入全屏模式:', err);
        });
    } else {
        // 退出全屏
        document.exitFullscreen().then(() => {
            console.log('已退出全屏模式');
            // 恢复正常的画布样式
            restoreCanvasStyle();
        }).catch(err => {
            console.error('无法退出全屏模式:', err);
        });
    }
}

function adjustCanvasForFullscreen() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
        // 获取当前可用的屏幕尺寸（全屏时的实际尺寸）
        const screenWidth = window.innerWidth || window.screen.width;
        const screenHeight = window.innerHeight || window.screen.height;
        
        // 计算缩放比例，优先适配宽度
        const scaleX = screenWidth / 1280;
        const scaleY = screenHeight / 1920;
        
        // 使用宽度缩放比例，让画布宽度填满屏幕
        const scale = scaleX;
        
        console.log(`全屏模式 - 屏幕尺寸: ${screenWidth}x${screenHeight}`);
        console.log(`宽度缩放比例: ${scaleX.toFixed(3)}, 高度缩放比例: ${scaleY.toFixed(3)}`);
        console.log(`选择宽度适配，缩放比例: ${scale.toFixed(3)}`);
        console.log(`计算后画布尺寸: ${(1280 * scale).toFixed(0)}x${(1920 * scale).toFixed(0)}`);
        
        // 先重置所有样式
        canvas.style.transform = '';
        canvas.style.position = '';
        canvas.style.top = '';
        canvas.style.left = '';
        canvas.style.margin = '';
        canvas.style.marginTop = '';
        canvas.style.marginLeft = '';
        
        // 应用新的样式 - 宽度填满，垂直居中
        canvas.style.position = 'fixed';
        canvas.style.top = '50%';
        canvas.style.left = '50%';
        canvas.style.transform = `translate(-50%, -50%) scale(${scale})`;
        canvas.style.transformOrigin = 'center center';
        canvas.style.zIndex = '100';
        
        console.log('已应用全屏样式（宽度适配）');
    }
}

function restoreCanvasStyle() {
    const canvas = document.querySelector('canvas');
    if (canvas) {
        console.log('恢复窗口模式样式');
        
        // 完全重置所有可能的样式
        canvas.style.transform = '';
        canvas.style.transformOrigin = '';
        canvas.style.position = '';
        canvas.style.top = '';
        canvas.style.left = '';
        canvas.style.margin = '';
        canvas.style.marginTop = '';
        canvas.style.marginLeft = '';
        canvas.style.zIndex = '';
        canvas.style.width = '';
        canvas.style.height = '';
        
        // 重新应用基本的居中样式，与style.css协调
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        canvas.style.maxWidth = '100vw';
        canvas.style.maxHeight = '100vh';
        canvas.style.objectFit = 'contain';
        
        // 延迟应用窗口适应
        setTimeout(() => {
            adjustCanvasForWindow();
        }, 50);
    }
}

// 添加新函数：非全屏模式下的自适应缩放
function adjustCanvasForWindow() {
    const canvas = document.querySelector('canvas');
    if (canvas && !document.fullscreenElement) {
        // 获取视口尺寸
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // 计算缩放比例
        const scaleX = viewportWidth / 1280;
        const scaleY = viewportHeight / 1920;
        
        // 窗口模式下仍然保持宽高比，避免变形
        const scale = Math.min(scaleX, scaleY, 1); // 限制最大缩放为1，避免放大
        
        // 应用缩放，但保持CSS的居中样式
        canvas.style.transform = `scale(${scale})`;
        canvas.style.transformOrigin = 'center center';
        canvas.style.maxWidth = '100vw';
        canvas.style.maxHeight = '100vh';
        
        console.log(`窗口模式 - 视口尺寸: ${viewportWidth}x${viewportHeight}, 缩放: ${scale.toFixed(2)}`);
    }
}

function initializeMatterJS() {
    // Create engine
    engine = Engine.create();
    world = engine.world;
    engine.world.gravity.y = 0.2;
    
    // Create renderer - attach to p5.js canvas instead of body
    render = Render.create({
        canvas: document.querySelector('canvas'), // Use p5.js canvas
        engine: engine,
        options: {
            width: 1280, // Updated to match canvas width
            height: 1920, // Updated to match canvas height
            hasBounds: true,
            wireframes: false,
            background: 'transparent', // 设置为透明
            showAngleIndicator: false,
            showVelocity: false,
            showDebug: false,
            showBroadphase: false,
            showBounds: false,
            showVelocity: false,
            showAngleIndicator: false,
            showIds: false,
            showShadows: false,
            showVertexNumbers: false,
            showConvexHulls: false,
            showInternalEdges: false
        }
    });
    
    // 摄像机跟随更新
    Events.on(engine, 'beforeUpdate', function() {
        updateCamera();
    });
    
    // 完全重写背景渲染逻辑
    Events.on(render, 'beforeRender', function() {
        var ctx = render.canvas.getContext('2d');
        
        // 不要清除画布，让 p5.js 的背景保持
        // ctx.clearRect(0, 0, render.canvas.width, render.canvas.height);
    });
    
    // 在所有物体渲染之后绘制背景（在物体下方）
    Events.on(render, 'afterRender', function() {
        if (window.nativeBackgroundImage && window.nativeBackgroundImage.complete) {
            var ctx = render.canvas.getContext('2d');
            
            try {
                ctx.save();
                
                // 使用 globalCompositeOperation 将背景绘制到最底层
                ctx.globalCompositeOperation = 'destination-over';
                
                // 使用 Matter.js 的视口变换
                Render.startViewTransform(render);
                
                // 绘制背景图片
                ctx.drawImage(window.nativeBackgroundImage, 0, 0, 1280, 3200);
                
                Render.endViewTransform(render);
                
                // 恢复正常的合成模式
                ctx.globalCompositeOperation = 'source-over';
                
                ctx.restore();
                
                console.log('背景已绘制到底层'); // 调试信息
            } catch (error) {
                console.error('绘制背景图片时出错:', error);
            }
        }
    });
    
    Render.run(render);
    
    // Create runner
    runner = Runner.create();
    Runner.run(runner, engine);
    
    // Add all the game objects
    createBridge();
    createHangingBalls();
    createMovingRectangles();
    createSeesaws();
    createMainBall();
    createWalls();
    setupMouseControl();
    setupEventListeners();
    setupBallTrail();
    setupCollisionEvents();
    setupCountDisplay();
}

function draw() {
    // p5.js draw loop is disabled with noLoop() in setup()
    // Matter.js handles all rendering
}

function createBridge() {
    // 创建主桥链 - 调整位置避免冲突
    createSingleBridge(width/2.8, width/1.6, 2180, 8);
    
    // 添加4个额外的桥链在不同位置 - 微调避免冲突
    createSingleBridge(width/5, width/2.8, 780, 6);      // 上层短桥
    createSingleBridge(width/1.9, width/1.3, 1180, 7);   // 中上层桥
    createSingleBridge(width/7, width/3.2, 1580, 5);     // 中层短桥  
    createSingleBridge(width/2.5, width/1.5, 2580, 9);   // 下层长桥
}

function createSingleBridge(leftX, rightX, y, segmentCount) {
    var particleOptions = { 
        friction: 0.05,
        frictionStatic: 0.1,
        render: { visible: true } 
    };
    
    var group = Body.nextGroup(true);
    
    // 计算桥链的起始X位置（居中）
    var bridgeStartX = leftX + (rightX - leftX) / 2 - (segmentCount * 25) / 2;
    
    var bridge = Composites.stack(bridgeStartX, y, segmentCount, 1, 0, 0,
        function(x, y) {
            return Bodies.rectangle(x - 10, y, 25, 15, { 
                collisionFilter: { group: group },
                chamfer: 5,
                density: 0.1,
                frictionAir: 0.05,
                label: 'bridgeSegment', // 使用桥链专用标签便于识别
                render: { fillStyle: '#060a19' }
            });
        });
    
    Composites.chain(bridge, 0.3, 0, -0.3, 0, { 
        stiffness: 0.99,
        length: 8,
        render: { visible: true },
        label: 'bridgeConstraint'
    });
    
    Composite.add(world, [
        bridge,
        Constraint.create({ 
            pointA: { x: leftX, y: y }, 
            bodyB: bridge.bodies[0], 
            pointB: { x: -5, y: 0 },
            length: 1,
            stiffness: 0.05
        }),
        Constraint.create({ 
            pointA: { x: rightX, y: y }, 
            bodyB: bridge.bodies[bridge.bodies.length - 1], 
            pointB: { x: 5, y: 0 },
            length: 1,
            stiffness: 0.05
        })
    ]);
}

function createHangingBall(x, y, radius, world, label = 'target') {
    var body = Bodies.circle(x, y, radius, {
        frictionAir: 0,
        friction: 0.1,
        restitution: 0.8,
        label: 'target',
        isStatic: false,
        render: { fillStyle: '#4a90e2' }
    });
    var constraint = Constraint.create({
        pointA: { x: x, y: 0 },
        bodyB: body,
        pointB: { x: 0, y: 0 },
        stiffness: 1, // 增加刚度，减少弯曲
        damping: 0.1, // 减少阻尼
        render: { 
            visible: true,
            lineWidth: 2,
            strokeStyle: '#ffffff',
            type: 'line' // 确保显示为直线
        }
    });
    Composite.add(world, [body, constraint]);
    return body;
}

function createHangingBalls() {
    // 上层区域 (300-700) - 避开桥链780位置
    createHangingBall(width/25*3, 320, 20, world, 'target');
    createHangingBall(width/25*7, 420, 25, world, 'target');
    createHangingBall(width/25*12, 380, 30, world, 'target');
    createHangingBall(width/25*16, 520, 25, world, 'target');
    createHangingBall(width/25*20, 460, 35, world, 'target');
    createHangingBall(width/25*23, 350, 20, world, 'target');
    
    // 中上层区域 (900-1100) - 避开桥链1180位置
    createHangingBall(width/25*2, 950, 25, world, 'target');
    createHangingBall(width/25*6, 1020, 30, world, 'target');
    createHangingBall(width/25*9, 980, 20, world, 'target');
    createHangingBall(width/25*13, 1050, 35, world, 'target');
    createHangingBall(width/25*22, 1000, 25, world, 'target');
    
    // 中层区域 (1300-1500) - 避开桥链1580位置
    createHangingBall(width/25*4, 1350, 30, world, 'target');
    createHangingBall(width/25*8, 1420, 25, world, 'target');
    createHangingBall(width/25*15, 1380, 35, world, 'target');
    createHangingBall(width/25*19, 1450, 20, world, 'target');
    createHangingBall(width/25*24, 1320, 30, world, 'target');
    
    // 中下层区域 (1700-2100) - 避开桥链2180位置
    createHangingBall(width/25*2, 1750, 25, world, 'target');
    createHangingBall(width/25*5, 1850, 30, world, 'target');
    createHangingBall(width/25*10, 1800, 20, world, 'target');
    createHangingBall(width/25*18, 1950, 35, world, 'target');
    createHangingBall(width/25*21, 1780, 25, world, 'target');
    
    // 下层区域 (2300-2500) - 避开桥链2580位置
    createHangingBall(width/25*3, 2350, 30, world, 'target');
    createHangingBall(width/25*8, 2420, 20, world, 'target');
    createHangingBall(width/25*14, 2380, 35, world, 'target');
    createHangingBall(width/25*20, 2450, 25, world, 'target');
    
    // 最下层区域 (2700-2900)
    createHangingBall(width/25*4, 2750, 25, world, 'target');
    createHangingBall(width/25*12, 2820, 20, world, 'target');
    createHangingBall(width/25*18, 2780, 30, world, 'target');
}

function createMovingRectangle(xStart, xMin, xMax, y, rectWidth, rectHeight, speed, label = 'target') {
    var direction = 1;
    var rectangle = Bodies.rectangle(xStart, y, rectWidth, rectHeight, { 
        isStatic: true,
        label: 'target',
        restitution: 0.8,
        friction: 0.1,
        render: { fillStyle: '#e74c3c' }
    });
    Composite.add(world, rectangle);
    
    Events.on(engine, 'beforeUpdate', function() {
        if (rectangle.position.x >= xMax) {
            direction = -1;
        } else if (rectangle.position.x <= xMin) {
            direction = 1;
        }
        Body.setPosition(rectangle, {
            x: rectangle.position.x + direction * speed,
            y: y
        });
    });
    
    return rectangle;
}

function createMovingRectangles() {
    // 上层区域 - 避开桥链780和hanging balls
    createMovingRectangle(80, width/25*2, width/25*6, 650, 80, 8, 0.4);
    createMovingRectangle(250, width/25*14, width/25*19, 720, 100, 6, 0.3);
    
    // 中上层区域 - 避开桥链1180
    createMovingRectangle(120, width/25*1, width/25*8, 1050, 120, 10, 0.5);
    createMovingRectangle(180, width/25*15, width/25*23, 1120, 90, 7, 0.35);
    
    // 中层区域 - 避开桥链1580
    createMovingRectangle(100, width/25*10, width/25*18, 1480, 110, 8, 0.45);
    createMovingRectangle(280, width/25*20, width/25*24, 1520, 95, 9, 0.4);
    
    // 中下层区域 - 避开桥链2180
    createMovingRectangle(150, width/25*1, width/25*12, 1920, 130, 12, 0.3);
    createMovingRectangle(200, width/25*15, width/25*24, 2020, 100, 8, 0.5);
    
    // 下层区域 - 避开桥链2580  
    createMovingRectangle(220, width/25*3, width/25*15, 2450, 140, 10, 0.35);
    createMovingRectangle(320, width/25*18, width/25*23, 2520, 85, 6, 0.6);
}

function createSeesaw(x, y, seesawWidth, seesawHeight, label = 'target', angularVelocity) {
    var body = Bodies.rectangle(x, y, seesawWidth, seesawHeight, { 
        label: label,
        restitution: 0.8,
        friction: 0.1,
        render: { fillStyle: '#f39c12' }
    });
    var constraint = Constraint.create({
        pointA: { x: x, y: y },
        bodyB: body,
        length: 0,
        label: 'target',
        isStatic: false,
        stiffness: 1
    });
    
    Composite.add(world, [body, constraint]);
    
    Events.on(engine, 'beforeUpdate', function() {
        Body.setAngularVelocity(body, angularVelocity);
    });
    
    return body;
}

function createSeesaws() {
    // 上层区域 (350-650) - 避开桥链780
    createSeesaw(180, 380, 120, 8, 'target', -0.025);
    createSeesaw(580, 480, 150, 7, 'target', 0.035);
    createSeesaw(950, 420, 100, 9, 'target', -0.04);
    
    // 中上层区域 (850-1080) - 避开桥链1180
    createSeesaw(120, 880, 180, 6, 'target', 0.03);
    createSeesaw(750, 920, 140, 8, 'target', -0.045);
    createSeesaw(450, 980, 160, 7, 'target', 0.025);
    
    // 中层区域 (1250-1480) - 避开桥链1580
    createSeesaw(280, 1280, 130, 9, 'target', -0.035);
    createSeesaw(680, 1350, 170, 6, 'target', 0.04);
    createSeesaw(1050, 1420, 145, 8, 'target', -0.03);
    
    // 中下层区域 (1650-1880) - 避开桥链2180
    createSeesaw(220, 1720, 155, 7, 'target', 0.038);
    createSeesaw(620, 1820, 125, 9, 'target', -0.042);
    createSeesaw(920, 1750, 165, 6, 'target', 0.028);
    
    // 下层区域 (2250-2450) - 避开桥链2580
    createSeesaw(320, 2280, 140, 8, 'target', -0.036);
    createSeesaw(720, 2350, 175, 7, 'target', 0.032);
    createSeesaw(480, 2420, 120, 9, 'target', -0.04);
    
    // 最下层区域 (2680-2900)
    createSeesaw(380, 2720, 160, 8, 'target', 0.035);
    createSeesaw(880, 2850, 135, 7, 'target', -0.03);
}

function createMainBall() {
    ball = Bodies.circle(width/2, height/4*3, 20, {
        frictionAir: 0.02, 
        friction: 0.1,
        restitution: 0.9,
        angle: 0,
        label: 'mainBall',
        render: { fillStyle: '#2ecc71' }
    });
    Composite.add(world, [ball]);
}

function createWalls() {
    Composite.add(world, [
        Bodies.rectangle(width/2, 3000, width, 100, { // 底部墙壁 - 加厚并确保位置正确
            isStatic: true, 
            render: { visible: false }, 
            label: 'wall'
        }),
        Bodies.rectangle(-50, 1500, 100, 3100, { // 左侧墙壁 - 加厚并覆盖整个世界高度
            isStatic: true, 
            render: { visible: false }, 
            label: 'wall'
        }),
        Bodies.rectangle(width/2, -50, width, 100, { // 顶部墙壁 - 加厚
            isStatic: true, 
            render: { visible: false }, 
            label: 'wall'
        }),
        Bodies.rectangle(width + 50, 1500, 100, 3100, { // 右侧墙壁 - 加厚并覆盖整个世界高度
            isStatic: true, 
            render: { visible: false }, 
            label: 'wall'
        }),
    ]);
}

function setupMouseControl() {
    var mouse = Mouse.create(render.canvas);
    var mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            angularStiffness: 0.3,
            stiffness: 0.5,
            render: { visible: false },
            label: 'mouse-constraint' // 添加标签以便识别
        }
    });
    
    // 修改鼠标约束，使其可以拖拽桥链但不拖拽 mainBall
    Events.on(mouseConstraint, 'startdrag', function(event) {
        var draggedBody = event.body;
        // 如果尝试拖拽 mainBall，则取消拖拽
        if (draggedBody.label === 'mainBall') {
            mouseConstraint.constraint.bodyB = null;
            mouseConstraint.constraint.pointB = null;
        }
    });
    
    Composite.add(world, mouseConstraint);
    render.mouse = mouse;
}

function setupEventListeners() {
    var isMouseConstraintActive = false;
    
    // 监听鼠标约束的开始和结束
    Events.on(engine, 'beforeUpdate', function() {
        var mouseConstraint = world.constraints.find(c => c.label === 'mouse-constraint');
        if (mouseConstraint) {
            isMouseConstraintActive = mouseConstraint.bodyB !== null;
        }
    });
    
    document.addEventListener('mousedown', function(event) {
        if (event.button === 0) {
            // 首次点击时尝试进入全屏
            if (!hasTriggeredFullscreen && !document.fullscreenElement) {
                toggleFullscreen();
            }
            
            // 延迟检查，确保鼠标约束有时间激活
            setTimeout(function() {
                // 只有当鼠标没有拖拽任何物体时，才对小球施加力
                if (!isMouseConstraintActive) {
                    applyLeftAndBounceForce(event.clientX);
                }
            }, 10);
        }
    });
    
    // 监听全屏状态变化
    document.addEventListener('fullscreenchange', function() {
        if (document.fullscreenElement) {
            console.log('全屏状态变化：已激活');
            // 延迟调整，确保全屏完全激活
            setTimeout(() => {
                adjustCanvasForFullscreen();
            }, 300);
        } else {
            console.log('全屏状态变化：已退出');
            restoreCanvasStyle();
        }
    });
    
    // 监听窗口大小变化（适应屏幕旋转等）
    window.addEventListener('resize', function() {
        console.log('窗口大小变化，当前全屏状态:', !!document.fullscreenElement);
        if (document.fullscreenElement) {
            setTimeout(() => {
                adjustCanvasForFullscreen();
            }, 100);
        } else {
            setTimeout(() => {
                adjustCanvasForWindow();
            }, 100);
        }
    });
    
    // 监听键盘事件
    document.addEventListener('keydown', function(event) {
        // 按 F 键切换全屏
        if (event.key === 'f' || event.key === 'F') {
            event.preventDefault();
            toggleFullscreen();
        }
        // 按 ESC 键退出全屏
        if (event.key === 'Escape' && document.fullscreenElement) {
            document.exitFullscreen();
        }
    });
    
    // 边界检测：使用画面坐标而不是世界坐标
    Events.on(engine, 'beforeUpdate', function () {
        Composite.allBodies(world).forEach(function (body) {
            // 对所有小球（mainBall 和 generatedBall）进行边界检测
            if (body.label === 'mainBall' || body.label === 'generatedBall') {
                // X轴边界检测（画面宽度 = 1280px）
                if (body.position.x < 0) {
                    Matter.Body.setPosition(body, { x: 10, y: body.position.y });
                    Matter.Body.setVelocity(body, { x: Math.abs(body.velocity.x), y: body.velocity.y });
                }
                if (body.position.x > 1280) {
                    Matter.Body.setPosition(body, { x: 1270, y: body.position.y });
                    Matter.Body.setVelocity(body, { x: -Math.abs(body.velocity.x), y: body.velocity.y });
                }
                
                // Y轴边界检测（世界高度 = 3200px，但这是正确的）
                if (body.position.y < 0) {
                    Matter.Body.setPosition(body, { x: body.position.x, y: 10 });
                    Matter.Body.setVelocity(body, { x: body.velocity.x, y: Math.abs(body.velocity.y) });
                }
                if (body.position.y > 3200) {
                    Matter.Body.setPosition(body, { x: body.position.x, y: 2990 });
                    Matter.Body.setVelocity(body, { x: body.velocity.x, y: -Math.abs(body.velocity.y) });
                }
            }
        });
    });
}

function setupBallTrail() {
    Events.on(render, 'afterRender', function() {
        ballTrail.unshift({
            position: Vector.clone(ball.position),
            speed: ball.speed
        });
        
        Render.startViewTransform(render);
        render.context.globalAlpha = 0.7;
        
        for (var i = 0; i < ballTrail.length; i += 1) {
            var point = ballTrail[i].position,
                speed = ballTrail[i].speed;
            
            var hue = 250 + Math.round((1 - Math.min(1, speed / 10)) * 170);
            render.context.fillStyle = 'hsl(' + hue + ', 100%, 55%)';
            render.context.fillRect(point.x, point.y, 2, 2);
        }
        
        render.context.globalAlpha = 1;
        Render.endViewTransform(render);
        
        if (ballTrail.length > 2000) {
            ballTrail.pop();
        }
    });
}

function updateCamera() {
    if (ball) {
        // 计算目标摄像机位置：让小球始终位于画面高度的一半
        var targetCameraY = ball.position.y - (height / 2);
        
        // 扩展边界限制，允许查看世界的最上端和最下端
        var worldHeight = 3200; // 扩展的世界高度
        var minCameraY = -200; // 允许摄像机向上超出一些，查看世界顶部
        var maxCameraY = worldHeight - height + 200; // 允许摄像机向下超出一些，查看世界底部
        
        // 将目标位置限制在扩展的有效范围内
        targetCameraY = Math.max(minCameraY, Math.min(maxCameraY, targetCameraY));
        
        if (camera.smoothFollow) {
            // 平滑跟随模式
            var lerpFactor = 0.3; // 较快的跟随速度
            camera.y += (targetCameraY - camera.y) * lerpFactor;
            
            // 如果差距很小，直接设置为目标位置，消除微小延迟
            if (Math.abs(targetCameraY - camera.y) < 1) {
                camera.y = targetCameraY;
            }
        } else {
            // 即时跟随模式 - 完全没有延迟
            camera.y = targetCameraY;
        }
        
        // 再次确保摄像机位置在扩展的有效范围内
        camera.y = Math.max(minCameraY, Math.min(maxCameraY, camera.y));
        
        // 更新 Matter.js 渲染器的视口边界
        render.bounds.min.y = camera.y;
        render.bounds.max.y = camera.y + height;
        
        // 保持 x 轴边界不变（不跟随横向移动）
        render.bounds.min.x = 0;
        render.bounds.max.x = width;
        
        // 调试信息：显示摄像机边界状态
        if (camera.y <= minCameraY + 10) {
            console.log('摄像机已到达世界顶部边界');
        }
        if (camera.y >= maxCameraY - 10) {
            console.log('摄像机已到达世界底部边界');
        }
    }
}

function setupCollisionEvents() {
    Events.on(engine, 'collisionStart', function (event) {
        var pairs = event.pairs;
        
        pairs.forEach(function (pair) {
            var bodyA = pair.bodyA;
            var bodyB = pair.bodyB;
            
            // 检查是否是 mainBall 与任何目标物体的碰撞
            var mainBallBody = null;
            var targetBody = null;
            
            // 检查与普通目标物体的碰撞
            if (bodyA.label === 'mainBall' && bodyB.label === 'target') {
                mainBallBody = bodyA;
                targetBody = bodyB;
            } else if (bodyB.label === 'mainBall' && bodyA.label === 'target') {
                mainBallBody = bodyB;
                targetBody = bodyA;
            }
            // 检查与桥链段的碰撞
            else if (bodyA.label === 'mainBall' && bodyB.label === 'bridgeSegment') {
                mainBallBody = bodyA;
                targetBody = bodyB;
            } else if (bodyB.label === 'mainBall' && bodyA.label === 'bridgeSegment') {
                mainBallBody = bodyB;
                targetBody = bodyA;
            }
            
            // 如果检测到碰撞
            if (mainBallBody && targetBody) {
                console.log('检测到 mainBall 与目标物体的碰撞:', targetBody.label);
                console.log('目标物体已生成球:', targetBody.generated);
                
                // 防止同一物体重复生成球
                if (targetBody.generated) {
                    console.log('该物体已经生成过球，跳过');
                    return;
                }
                
                // 标记该物体已生成球
                targetBody.generated = true;
                
                // 在碰撞点创建新球
                var newBallX = (bodyA.position.x + bodyB.position.x) / 2;
                var newBallY = (bodyA.position.y + bodyB.position.y) / 2;
                var newBallRadius = Math.random() * 8 + 5; // 随机大小 5-13
                
                var newBall = Bodies.circle(newBallX, newBallY, newBallRadius, {
                    restitution: 0.8,
                    frictionAir: 0.02,
                    friction: 0.1,
                    render: { 
                        fillStyle: `hsl(${Math.random() * 360}, 70%, 60%)` // 随机颜色
                    },
                    label: 'generatedBall'
                });
                
                // 给新球施加随机初始速度
                Body.setVelocity(newBall, {
                    x: (Math.random() - 0.5) * 10,
                    y: (Math.random() - 0.5) * 10
                });
                
                // 添加新球到世界
                Composite.add(world, newBall);
                generatedBallsCount++;
                
                console.log(`成功生成新球！位置: (${newBallX.toFixed(1)}, ${newBallY.toFixed(1)}), 总数: ${generatedBallsCount}`);
                
                // 视觉反馈 - 目标物体短暂变白
                var originalColor = targetBody.render.fillStyle;
                targetBody.render.fillStyle = '#ffffff';
                setTimeout(() => {
                    if (targetBody.render) {
                        targetBody.render.fillStyle = originalColor;
                    }
                }, 200);
            }
        });
    });
}

function setupCountDisplay() {
    countDisplay = document.createElement('div');
    countDisplay.style.position = 'absolute';
    countDisplay.style.top = '110px'; // 调整位置，为全屏按钮留空间
    countDisplay.style.left = '10px'; // 与按钮左对齐
    countDisplay.style.fontSize = '16px';
    countDisplay.style.color = '#5599FF';
    countDisplay.style.fontFamily = 'Arial, sans-serif';
    countDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // 半透明黑色背景
    countDisplay.style.padding = '5px 10px';
    countDisplay.style.borderRadius = '5px';
    countDisplay.innerText = `生成的小球数量: ${generatedBallsCount}`;
    document.body.appendChild(countDisplay);
    
    Events.on(engine, 'afterUpdate', function () {
        countDisplay.innerText = `生成的小球数量: ${generatedBallsCount}`;
    });
}

function applyLeftAndBounceForce(mouseX) {
    var forceX = 0;
    var forceY = -0.1;
    
    if (mouseX < ball.position.x) {
        forceX = -0.05;
    }
    if (mouseX > ball.position.x) {
        forceX = 0.05;
    }
    
    Body.applyForce(ball, ball.position, { x: forceX, y: forceY });
}

function resetBall() {
    Matter.Body.setPosition(ball, { x: width/2, y: height/4*3 });
    Matter.Body.setVelocity(ball, { x: 0, y: 0 });
    
    // 重置摄像机位置，使用新的边界范围
    var targetCameraY = ball.position.y - (height / 2);
    var worldHeight = 3000;
    var minCameraY = -200; // 使用与 updateCamera 相同的边界
    var maxCameraY = worldHeight - height + 200;
    camera.y = Math.max(minCameraY, Math.min(maxCameraY, targetCameraY));
    
    render.bounds.min.y = camera.y;
    render.bounds.max.y = camera.y + height;
    
    console.log('Ball has been reset!');
}

function draw() {
    // p5.js draw loop is disabled with noLoop() in setup()
    // Matter.js handles all rendering
}
