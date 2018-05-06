function preload() {
    this.load.image('tiles', '/static/assets/Tilesheet/tilesheet_complete.png');
    this.load.image('player', 'static/assets/PNG/Man Blue/manBlue_gun.png');
}

function create() {
    var data = [[1,2,3],[4,5,6]];
    var map = this.make.tilemap({data: data, tileWidth:64, tileHeight:64});
    var tiles = map.addTilesetImage('tiles');
    var layer = map.createStaticLayer(0, tiles, 0, 0);
    var player = this.add.sprite(100, 100, 'player');

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
            create: create
        }
    };

    var game = new Phaser.Game(config);
})
