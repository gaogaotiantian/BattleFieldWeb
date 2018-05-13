url = "localhost:8000"
url = "battlefieldweb.herokuapp.com"
server_url = "http://"+url
ws_url = "ws://"+url

game = {};
game['id'] = 0;
gameObjects = {};
phaserGame = null;

var channel = Math.random().toString().substring(2,15);
var playerHitQueue = [];
var playerChangeWeaponQueue = [];
var gameInfoSocket = null;
var sendActionSocket = null;

function connectToServer() {
    if (gameInfoSocket) {
        gameInfoSocket.onclose = null;
        gameInfoSocket.close();
    }
    if (sendActionSocket) {
        sendActionSocket.onclose = null;
        sendActionSocket.close();
    }
    gameInfoSocket = new WebSocket(ws_url+"/getGameInfo/" + channel);
    sendActionSocket = new WebSocket(ws_url+"/sendAction/" + channel);

    $('#connect-button').addClass('disabled');
    $('#connection-status').text("");

    gameInfoSocket.onmessage = function(message) {
        var data = JSON.parse(message.data);
        if (data['infoType']) {
            if (data['infoType'] == 'dynamicGameInfo') {
                if (data['players']) {
                    game['players'] = data['players'];
                    game['bullets'] = data['bullets'];
                    game['items']   = data['items'];
                    game['timestamp'] = data['timestamp'];
                    var deltaTime = Date.now() / 1000.0 - game['timestamp'];
                    if (!game['clientDeltaTime'] || Math.abs(deltaTime - game['clientDeltaTime']) > 0.15) {
                        game['clientDeltaTime'] = deltaTime;
                    }
                }
            } else if (data['infoType'] == 'staticMapInfo') {
                //if (data['map']) {
                //    game['map'] = data['map'];
                //    //updateMap();
                //}
            } else if (data['infoType'] == 'joinInfo') {
                game['id'] = data['id'];
            } else if (data['infoType'] == 'event') {
                for (var i = 0; i < data['event'].length; i++) {
                    var e = data['event'][i];
                    if (e['eventType'] == 'playerDown') {
                        playerDown(e['id']);
                    } else if (e['eventType'] == 'bulletHit') {
                        playerHitQueue.push(e['player']);
                    }
                }
            }
        }
    }
    gameInfoSocket.onclose = function() {
        $('#connection-status').text("失去连接");
        $('#connect-button').removeClass('disabled');
    }
    sendActionSocket.onclose = function() {
        $('#connection-status').text("失去连接");
        $('#connect-button').removeClass('disabled');
    }

}

function sendMove(x, y) {
    if (sendActionSocket.readyState == 1) {
        if (game['id']) {
            sendActionSocket.send(JSON.stringify({
                "actionType": "move",
                "player": game['id'],
                "x": x,
                "y": y 
            }));
        }
    }
}

function sendShoot(x, y) {
    if (sendActionSocket.readyState == 1) {
        if (game['id']) {
            sendActionSocket.send(JSON.stringify({
                "actionType": "shoot",
                "player": game['id'],
                "x": x,
                "y": y
            }));
        }
    }
}

function sendJoin() {
    if (sendActionSocket.readyState == 1) {
        sendActionSocket.send(JSON.stringify({
            "actionType": "join",
            "name": $('#username-input').val()
        }));
    }
}

function sendRestart() {
    sendActionSocket.send(JSON.stringify({
        "actionType": "restart"
    }));
}

function playerDown(id) {
    console.log("player down")
}

function getGunType(gunName) {
    if (['base', 'german_pistol'].indexOf(gunName) >= 0) {
        return "gun";
    } else if (['mp_40', 'mp_43', 'fg_42'].indexOf(gunName) >= 0) {
        return "machine";
    } else if (['m1_carbine'].indexOf(gunName) >= 0) {
        return "silencer";
    }
    return "gun";
}

function updatePlayerInfo() {
    $('#player-info-div').empty();
    if (game['players']) {
        var playerInfo = JSON.parse(JSON.stringify(game['players']));
        playerInfo.sort(function(a,b) {
            if (a.kill > b.kill) {
                return -1;
            } else if (a.kill < b.kill) {
                return 1;
            } else {
                return a.death - b.death;
            }
        });
        var $userRow = $('<div>').addClass('row');
        $userRow.append($('<div>').addClass('col-6 px-0').text("Name"));
        $userRow.append($('<div>').addClass('col-3 px-0').text("K"));
        $userRow.append($('<div>').addClass('col-3 px-0').text("D"));
        $('#player-info-div').append($userRow);
        for (var i = 0; i < playerInfo.length; i++) {
            var p = playerInfo[i];
            var $userRow = $('<div>').addClass('row');
            $userRow.append($('<div>').addClass('col-6 px-0').text(p.name));
            $userRow.append($('<div>').addClass('col-3 px-0').text(p.kill.toString()));
            $userRow.append($('<div>').addClass('col-3 px-0').text(p.death.toString()));
            $('#player-info-div').append($userRow);
        }
    }
}

function getObjectPosition(obj) {
    var deltaTime = Date.now() / 1000.0 - game['clientDeltaTime'] - game['timestamp'];
    var ret = {};
    ret['x'] = obj['x'] + Math.cos(obj['angle']) * deltaTime * obj['speed'];
    ret['y'] = obj['y'] + Math.sin(obj['angle']) * deltaTime * obj['speed'];
    return ret;
}
function updateMap() {
    var map = gameObjects['map'];
    var data = game['map']['tile'];
    map.putTilesAt(data, 0, 0);
}
function preload() {
    this.load.image('tileImage', '/static/assets/Tilesheet/tilesheet_complete.png');
    this.load.image('player_gun', 'static/assets/PNG/Man Blue/manBlue_gun.png');
    this.load.image('player_machine', 'static/assets/PNG/Man Blue/manBlue_machine.png');
    this.load.image('player_silencer', 'static/assets/PNG/Man Blue/manBlue_silencer.png');
    this.load.image('bullet', '/static/assets/blaster/images/image95.png');
    this.load.image('bullet_size1', '/static/assets/bullets/size1.png');
    this.load.image('bullet_size2', '/static/assets/bullets/size2.png');
    this.load.image('bullet_size3', '/static/assets/bullets/size3.png');
    this.load.image('bullet_size4', '/static/assets/bullets/size4.png');
    this.load.image('bullet_size5', '/static/assets/bullets/size5.png');
    this.load.image('bullet_size6', '/static/assets/bullets/size6.png');
    this.load.image('bullet_size7', '/static/assets/bullets/size7.png');
    this.load.image('bullet_whitefast', '/static/assets/bullets/white_fast.png');
    this.load.image('bullet_yellowfast', '/static/assets/bullets/yellow_fast.png');
    this.load.image('random_weapon_buff', '/static/assets/buffs/purple_gem.png');
    this.load.image('random_player_buff', '/static/assets/buffs/green_gem.png');
    this.load.image('health', '/static/assets/heart.png');

    // weapons
    this.load.image('german_pistol', '/static/assets/weapons/german_pistol.png');
    this.load.image('m1_carbine', '/static/assets/weapons/m1_carbine.png');
    this.load.image('mp_43', '/static/assets/weapons/mp_43.png');
    this.load.image('mp_40', '/static/assets/weapons/mp_40.png');
    this.load.image('fg_42', '/static/assets/weapons/fg_42.png');
    this.load.tilemapTiledJSON('mapJSON', '/static/map.json');
}

var cameraControls;
function create() {
    var map = this.make.tilemap({key: 'mapJSON'});
    var tiles = map.addTilesetImage('tile', 'tileImage');
    var layer = map.createStaticLayer(1, tiles, 0, 0);
    var layer2 = map.createStaticLayer(2, tiles, 0, 0);

    gameObjects['players'] = {};
    gameObjects['bullets'] = {};
    gameObjects['items']   = {};
    gameObjects['map'] = map;

    // events
    this.input.on('pointerdown', function(pointer) {
        var p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        if (pointer.buttons == 1) { 
            // left click
            sendMove(p.x, p.y);
        } else if (pointer.buttons == 2) {
            // right click
            sendShoot(p.x, p.y);
        }
        
    }, this);

    var cursors = this.input.keyboard.createCursorKeys();
    var cameraControlConfig = {
        camera: this.cameras.main,
        left: cursors.left,
        right: cursors.right,
        up: cursors.up,
        down: cursors.down,
        zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
        zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X),
        acceleration: 0.6,
        drag: 0.05,
        maxSpeed: 1.0
    }
    cameraControls = new Phaser.Cameras.Controls.Smoothed(cameraControlConfig);

    this.events.on('resize', resize, this);
    setInterval(updatePlayerInfo, 500);
}

var mainCamera;
function updatePlayers(phaser) {
    var existIdList = [];
    for (var i in game['players']) {
        var player = game['players'][i];
        var pos = getObjectPosition(player);
        var id = player['id'];
        existIdList.push(id);
        if (player['dead']) {
            if (gameObjects['players'][id]) {
                gameObjects['players'][id].destroy(destroyChildren = true);
                delete gameObjects['players'][id];
            }
            
        } else {
            if (gameObjects['players'][id]) {
                var gameObj = gameObjects['players'][id];
                var gunType = getGunType(player['weapon']);
                if (gunType != gameObj.gunType) {
                    var deleteImage = gameObj.getChildren()[0];
                    gameObj.getChildren()[0] = phaser.add.image(player['x'], player['y'], "player_"+gunType);
                    gameObj.gunType = gunType;
                    deleteImage.destroy();
                }
                var graphics = gameObj.getChildren()[1];
                Phaser.Actions.ShiftPosition(gameObj.getChildren(), pos['x'], pos['y']);
                gameObj.getChildren()[0].rotation = player['angle'];

                if (graphics) {
                    graphics.clear();
                    graphics.fillStyle(0xff0000, 0.5);
                    graphics.fillRect(-32, -32, 64*player['hp']/100, 5);
                }

            } else {
                var group = phaser.add.group();
                group.create(player['x'], player['y'], 'player_gun');
                var graphics = phaser.add.graphics();
                graphics.fillStyle(0xff0000, 0.5);
                graphics.fillRect(-32, -32, 64, 5);
                group.add(graphics);
                group.gunType = getGunType(player['weapon']); 
                gameObjects['players'][id] = group;
            }
        }
    }
    if (existIdList.length != gameObjects.playerNum) {
        var deleteIdList = [];
        var playerNum = 0;
        for (var i in gameObjects['players']) {
            if (existIdList.indexOf(parseInt(i)) < 0) {
                deleteIdList.push(i);
            } else {
                playerNum += 1;
            }
        }
        gameObjects.playerNum = playerNum;

        for (var i in deleteIdList) {
            var id = deleteIdList[i];
            if (id == game['id']) {
                game['id'] = 0;
            }
            if (gameObjects['players'][id]) {
                gameObjects['players'][id].destroy(destroyChildren = true);
                delete gameObjects['players'][id];
            }
        }
    }

    while (playerHitQueue.length > 0) {
        var playerId = playerHitQueue.shift();
        if (gameObjects['players'][playerId]) {
            var p = gameObjects['players'][playerId];
            var img = p.getChildren()[0];
            img.setTint(0xff0000);
            phaser.time.delayedCall(300, function(img){img.setTint(0xffffff)}, [img], this);
        }
    }

}
function updateBullets(phaser) {
    var existIdList = []
    for (var i in game['bullets']) {
        var bullet = game['bullets'][i];
        var pos = getObjectPosition(bullet);
        var id = bullet['id'];
        existIdList.push(id);
        if (gameObjects['bullets'][id]) {
            var gameObj = gameObjects['bullets'][id]
            Phaser.Actions.ShiftPosition(gameObj.getChildren(), pos['x'], pos['y']);
            gameObj.getChildren()[0].rotation = bullet['angle'];
        } else {
            var group = phaser.add.group();
            var bullet_type = "";
            if (bullet.speed >= 400) {
                bullet_type = "bullet_yellowfast";
            } else if (bullet.size >= 10) {
                bullet_type = "bullet_size7";
            } else if (bullet.size >= 8) {
                bullet_type = "bullet_size6";
            } else if (bullet.size >= 6) {
                bullet_type = "bullet_size5";
            } else if (bullet.size >= 4) {
                bullet_type = "bullet_size4";
            } else if (bullet.size >= 3) {
                bullet_type = "bullet_size3";
            } else if (bullet.size >= 2) {
                bullet_type = "bullet_size2";
            } else if (bullet.size >= 1) {
                bullet_type = "bullet_size1";
            }
            group.create(bullet['x'], bullet['y'], bullet_type);
            group.getChildren()[0].rotation = bullet['angle'];
            gameObjects['bullets'][id] = group;
        }
    }
    
    if (existIdList.length != gameObjects.bulletNum) {
        var deleteIdList = [];
        var bulletNum = 0;
        for (var i in gameObjects['bullets']) {
            if (existIdList.indexOf(parseInt(i)) < 0) {
                deleteIdList.push(i);
            } else {
                bulletNum += 1;
            }
        }
        gameObjects.bulletNum = bulletNum;

        for (var i in deleteIdList) {
            var id = deleteIdList[i];
            if (gameObjects['bullets'][id]) {
                gameObjects['bullets'][id].destroy(destroyChildren = true);
                delete gameObjects['bullets'][id];
            }
        }
    }
}

function updateItems(phaser) {
    var existIdList = []
    for (var i in game['items']) {
        var item = game['items'][i];
        var id = item['id'];
        existIdList.push(id);
        if (gameObjects['items'][id]) {
            var gameObj = gameObjects['items'][id]
            Phaser.Actions.ShiftPosition(gameObj.getChildren(), item['x'], item['y']);
        } else {
            var group = phaser.add.group();
            group.create(item['x'], item['y'], item['itemType']);
            gameObjects['items'][id] = group;
        }
    }
    
    var deleteIdList = [];
    var itemNum = 0;
    for (var i in gameObjects['items']) {
        if (existIdList.indexOf(parseInt(i)) < 0) {
            deleteIdList.push(i);
        } else {
            itemNum += 1;
        }
    }
    gameObjects.itemNum = itemNum;

    for (var i in deleteIdList) {
        var id = deleteIdList[i];
        if (gameObjects['items'][id]) {
            gameObjects['items'][id].destroy(destroyChildren = true);
            delete gameObjects['items'][id];
        }
    }
    
}
function update(t, delta) {
    updatePlayers(this);
    updateBullets(this);
    updateItems(this);

    // Set up cameras
    var myObject = gameObjects['players'][game['id']];
    if (myObject) {
        mainCamera = this.cameras.main;
        var diffX = myObject.getChildren()[0].x - this.cameras.main.width/2 - this.cameras.main.scrollX;
        var diffY = myObject.getChildren()[0].y - this.cameras.main.height/2 - this.cameras.main.scrollY;
        var count = 0;
        while (Math.abs(diffX) > 1 && count < 5) {
            diffX /= 2;
            count += 1;
        }
        this.cameras.main.scrollX += diffX;

        count = 0;
        while (Math.abs(diffY) > 1 && count < 5) {
            diffY /= 2;
            count += 1;
        }
        this.cameras.main.scrollY += diffY;
        this.cameras.main.setZoom(1);
    } else {
        cameraControls.update(delta);
    }

}

function resize(width, height) {
    if (width === undefined) { 
        width = this.sys.game.config.width; 
    }
    if (height === undefined) {
        height = this.sys.game.config.height; 
    }

    this.cameras.resize(width, height);

}
$(function() {
    var contextCreationConfig = {
        alpha: false,
        depth: false,
        antialias: true,
        premultipliedAlpha: true,
        stencil: true,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default'
    };
    var config = {
        type: Phaser.AUTO,
        width: $('#game-canvas-div').width(),
        height: window.innerHeight - 30,
        parent: 'game-canvas-div',
        canvas: $('#game-canvas')[0],
        scene: {
            preload: preload,
            create: create,
            update: update,
            resize: resize
        }
    };

    phaserGame = new Phaser.Game(config);

    window.addEventListener('resize', function(event) {
        phaserGame.resize($('#game-canvas-div').width(), window.innerHeight- 30);
    }, false);

    document.oncontextmenu = function() {
        return false;
    }

    $('#join-game-button').click(function() {
        sendJoin();
        this.blur();
    });

    $('#connect-button').click(function(){
        connectToServer();
        this.blur();
    });
    connectToServer();
})
