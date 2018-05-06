server_url = "http://localhost:8000/"
game = {"x":0, "y":0}
function updateGameInfo() {
    $.ajax({
        url:server_url + "getGameInfo",
        method: "GET",
        dataType: "json",
        contentType: 'application/json;charset=UTF-8',
        success: function(data) {
            if (data['x']) {
                game['x'] = data['x'];
            }
            if (data['y']) {
                game['y'] = data['y'];
            }
            setTimeout(updateGameInfo, 500);
        }
    })
}
gameObjects = {};
function preload() {
    this.load.image('tiles', '/static/assets/Tilesheet/tilesheet_complete.png');
    this.load.image('player', 'static/assets/PNG/Man Blue/manBlue_gun.png');
}

function create() {
    var data = [[1,2,3],[4,5,6]];
    var map = this.make.tilemap({data: data, tileWidth:64, tileHeight:64});
    var tiles = map.addTilesetImage('tiles');
    var layer = map.createStaticLayer(0, tiles, 0, 0);
    var group = this.add.group();
    group.create(100, 100, 'player');

    gameObjects['player'] = group;
}

function update() {
    console.log(game);
    console.log(gameObjects['player']);
    Phaser.Actions.ShiftPosition(gameObjects['player'].getChildren(), game['x']*32, game['y']*32);
    
}
$(function() {
    var config = {
        type: Phaser.AUTO,
        width: 800,
        height: 800,
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

    var game = new Phaser.Game(config);
    updateGameInfo();
})
