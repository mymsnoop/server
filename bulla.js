var game=function(){
    var Box2D=require('./box2d.js');
    this.playerArray=new Array();
    this.ammo=new Array();
    this.ammoavl=new Array();
    var ammofree=new Array();
    this.avl=new Array();
    this.free=[5,4,3,2,1,0];
    this.buffer=[];
    var SCALE = 60;
    var WorldStep=60;
    var count=0;
    this.gameStarted=false;
    var tankSize={"width":100,"height":40};
    var ammoSize= new Array();
    ammoSize[0]={"width":10,"height":10};
    ammoSize[1]={"width":40,"height":12};
    var missileEnation=85/SCALE;
    var turnRate=0.7;
    var teleportationTime=0.5*WorldStep;
    var invisibleTime=5*WorldStep;
    var nitroTime=2*WorldStep;
    console.log("hello");
    var velDel=1/SCALE;
    var c=0;
    function construct(){
        for(var i=99;i>=0;i--){
            //console.log(i);
            ammofree.push(i);
        }

        console.log(ammofree);
    }
    construct();
}
module.exports=game;