//url = "localhost:8000"
url = "battlefieldweb.herokuapp.com"
server_url = "http://"+url
ws_url = "ws://"+url

game = {};
game['id'] = 0;
gameObjects = {};
phaserGame = null;

var channel = Math.random().toString().substring(2,15);
var gameInfoSocket = new ReconnectingWebSocket(ws_url+"/getGameInfo/" + channel);
var sendActionSocket = new ReconnectingWebSocket(ws_url+"/sendAction/" + channel);
var playerHitQueue = [];
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
                if (!game['clientDeltaTime'] || Math.abs(deltaTime - game['clientDeltaTime']) > 0.3) {
                    game['clientDeltaTime'] = deltaTime;
                }
            }
        } else if (data['infoType'] == 'staticMapInfo') {
            if (data['map']) {
                game['map'] = data['map'];
                //updateMap();
            }
        } else if (data['infoType'] == 'joinInfo') {
            game['id'] = data['id'];
        } else if (data['infoType'] == 'event') {
            var e = data['event'];
            if (e['eventType'] == 'playerDown') {
                playerDown(e['id']);
            } else if (e['eventType'] == 'bulletHit') {
                playerHitQueue.push(e['player']);
            }
        }
    }
}

function sendMove(x, y) {
    if (game['id']) {
        sendActionSocket.send(JSON.stringify({
            "actionType": "move",
            "player": game['id'],
            "x": x,
            "y": y 
        }));
    }
}

function sendShoot(x, y) {
    if (game['id']) {
        sendActionSocket.send(JSON.stringify({
            "actionType": "shoot",
            "player": game['id'],
            "x": x,
            "y": y
        }));
    }
}

function sendJoin() {
    sendActionSocket.send(JSON.stringify({
        "actionType": "join",
        "name": $('#username-input').val()
    }));
}

function sendRestart() {
    sendActionSocket.send(JSON.stringify({
        "actionType": "restart"
    }));
}

function playerDown(id) {
    console.log("player down")
}

function updatePlayerInfo() {
    $('#player-info-div').empty();
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
    for (var i = 0; i < playerInfo.length; i++) {
        var p = playerInfo[i];
        $('#player-info-div').append($('<p>').text(p.name + " " + p.kill.toString() + "/" + p.death.toString()));
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
    this.load.image('player', 'static/assets/PNG/Man Blue/manBlue_gun.png');
    this.load.image('bullet', '/static/assets/blaster/images/image95.png');
    this.load.image('health', '/static/assets/heart.png');
    this.load.tilemapTiledJSON('mapJSON', '/static/map.json');
}

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
                group.create(player['x'], player['y'], 'player');
                var graphics = phaser.add.graphics();
                graphics.fillStyle(0xff0000, 0.5);
                graphics.fillRect(-32, -32, 64, 5);
                group.add(graphics)
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
            group.create(bullet['x'], bullet['y'], 'bullet');
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
    
    if (existIdList.length != gameObjects.itemNum) {
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
    
}
function update() {
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
    }

    //if (game['map'] && game['map']['tile']) {
    //    updateMap(this, game['map']['tile']);
    //}
    
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
        height: window.innerHeight,
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
        phaserGame.resize($('#game-canvas-div').width(), window.innerHeight);
    }, false);

    document.oncontextmenu = function() {
        return false;
    }

    $('#join-game-button').click(function() {
        sendJoin();
        this.blur();
    });
})
