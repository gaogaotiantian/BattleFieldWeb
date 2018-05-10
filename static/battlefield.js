//url = "localhost:8000"
url = "battlefieldweb.herokuapp.com"
server_url = "http://"+url
ws_url = "ws://"+url

game = {};
game['id'] = 0;
gameObjects = {};
phaser = null;

var channel = Math.random().toString().substring(2,15);
var gameInfoSocket = new ReconnectingWebSocket(ws_url+"/getGameInfo/" + channel);
var sendActionSocket = new ReconnectingWebSocket(ws_url+"/sendAction/" + channel);

gameInfoSocket.onmessage = function(message) {
    var data = JSON.parse(message.data);
    if (data['infoType']) {
        if (data['infoType'] == 'dynamicGameInfo') {
            if (data['players']) {
                game['players'] = data['players'];
                game['bullets'] = data['bullets'];
                game['timestamp'] = data['timestamp'];
                var deltaTime = Date.now() / 1000.0 - game['timestamp'];
                if (!game['clientDeltaTime'] || Math.abs(deltaTime - game['clientDeltaTime']) > 0.5) {
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
            }
        }
    }
}

function sendMove(x, y) {
    sendActionSocket.send(JSON.stringify({
        "actionType": "move",
        "player": game['id'],
        "x": x,
        "y": y 
    }));
}

function sendShoot(x, y) {
    sendActionSocket.send(JSON.stringify({
        "actionType": "shoot",
        "player": game['id'],
        "x": x,
        "y": y
    }));
}

function sendJoin() {
    sendActionSocket.send(JSON.stringify({
        "actionType": "join"
    }));
}

function sendRestart() {
    sendActionSocket.send(JSON.stringify({
        "actionType": "restart"
    }));
}
function updateGameInfo() {
    $.ajax({
        url:server_url + "getGameInfo",
        method: "GET",
        dataType: "json",
        contentType: 'application/json;charset=UTF-8',
        success: function(data) {
        },
        complete: function() {
            setTimeout(updateGameInfo, 500);
        }
    })
}
function playerDown(id) {
    console.log("player down")
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
    this.load.tilemapTiledJSON('mapJSON', '/static/map.json');
}

function create() {
    var map = this.make.tilemap({key: 'mapJSON'});
    var tiles = map.addTilesetImage('tile', 'tileImage');
    var layer = map.createStaticLayer(1, tiles, 0, 0);
    var layer2 = map.createStaticLayer(2, tiles, 0, 0);

    gameObjects['players'] = {};
    gameObjects['bullets'] = {};
    gameObjects['map'] = map;

    // events
    this.input.on('pointerdown', function(pointer) {
        console.log(pointer)
        var p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        if (pointer.buttons == 1) { 
            // left click
            sendMove(p.x, p.y);
        } else if (pointer.buttons == 2) {
            // right click
            sendShoot(p.x, p.y);
        }
        
    }, this);
    console.log(this.cameras.main)
}

var mainCamera;
function update() {
    for (var i in game['players']) {
        var player = game['players'][i];
        var pos = getObjectPosition(player);
        var id = player['id'];
        if (player['dead']) {
            if (gameObjects['players'][id]) {
                gameObjects['players'][id].destroy(destroyChildren = true);
                delete gameObjects['players'][id];
            }
            
        } else {
            if (gameObjects['players'][id]) {
                var gameObj = gameObjects['players'][id]
                Phaser.Actions.ShiftPosition(gameObj.getChildren(), pos['x'], pos['y']);
                gameObj.getChildren()[0].rotation = player['angle'];
            } else {
                var group = this.add.group();
                group.create(player['x'], player['y'], 'player');
                gameObjects['players'][id] = group;
            }
        }
    }

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
            var group = this.add.group();
            group.create(bullet['x'], bullet['y'], 'bullet');
            gameObjects['bullets'][id] = group;
        }
    }
    
    var deleteIdList = []
    for (var i in gameObjects['bullets']) {
        if (existIdList.indexOf(parseInt(i)) < 0) {
            deleteIdList.push(i);
        }
    }

    for (var i in deleteIdList) {
        var id = deleteIdList[i];
        if (gameObjects['bullets'][id]) {
            gameObjects['bullets'][id].destroy(destroyChilder = true);
            delete gameObjects['bullets'][id];
        }
    }

    // Set up cameras
    var myObject = gameObjects['players'][game['id']];
    if (myObject) {
        mainCamera = this.cameras.main;
        var diffX = myObject.getChildren()[0].x - 480 - this.cameras.main.scrollX;
        var diffY = myObject.getChildren()[0].y - 480 - this.cameras.main.scrollY;
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
$(function() {
    var config = {
        type: Phaser.AUTO,
        width: 960,
        height: 960,
        physics: {
            default: 'arcade',
            arcade: {}
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    phaser = new Phaser.Game(config);

    document.oncontextmenu = function() {
        return false;
    }

    $('#join-game-button').click(function() {
        sendJoin();
        this.blur();
    });
})
