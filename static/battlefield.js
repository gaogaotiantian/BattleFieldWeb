url = "localhost:8000"
server_url = "http://"+url
ws_url = "ws://"+url

game = {};
gameObjects = {};
phaser = null;

var gameInfoSocket = new ReconnectingWebSocket(ws_url+"/getGameInfo");
var sendActionSocket = new ReconnectingWebSocket(ws_url+"/sendAction");

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
        }
    }
}

function sendMove(x, y) {
    sendActionSocket.send(JSON.stringify({
        "actionType": "move",
        "x": x,
        "y": y 
    }));
}

function sendShoot() {
    sendActionSocket.send(JSON.stringify({
        "actionType": "shoot"
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
    this.load.image('tiles', '/static/assets/Tilesheet/tilesheet_complete.png');
    this.load.image('player', 'static/assets/PNG/Man Blue/manBlue_gun.png');
    this.load.image('bullet', '/static/assets/blaster/images/image95.png');
}

function create() {
    var map = this.make.tilemap({tileWidth:32, tileHeight:32, width: 30, height: 30});
    var tiles = map.addTilesetImage('tiles');
    var layer = map.createBlankDynamicLayer('layer', tiles);

    gameObjects['player'] = {};
    gameObjects['bullets'] = {};
    gameObjects['map'] = map;

    // events
    this.input.on('pointerdown', function(pointer) {
        sendMove(pointer.x, pointer.y);
    }, this);

    this.input.keyboard.on('keydown_SPACE', function(event) {
        sendShoot();
    })
}

function update() {
    for (var i in game['players']) {
        var player = game['players'][i];
        var pos = getObjectPosition(player);
        var id = player['id'];
        if (gameObjects['player'][id]) {
            var gameObj = gameObjects['player'][id]
            Phaser.Actions.ShiftPosition(gameObj.getChildren(), pos['x'], pos['y']);
            gameObj.getChildren()[0].rotation = player['angle'];
        } else {
            var group = this.add.group();
            group.create(player['x'], player['y'], 'player');
            gameObjects['player'][id] = group;
        }
    }

    for (var i in game['bullets']) {
        var bullet = game['bullets'][i];
        var pos = getObjectPosition(bullet);
        var id = bullet['id'];
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
    if (game['map'] && game['map']['tile']) {
        updateMap(this, game['map']['tile']);
    }
    
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
})
