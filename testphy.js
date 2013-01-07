var net = require('net');
var Box2D=require('./box2d.js');
var playerArray=new Array();
var ammo=new Array();
var ammoavl=new Array();
var ammofree=new Array();
var avl=new Array();
var free=[5,4,3,2,1,0];
var buffer=[];
var gameStep;
var SCALE = 60;
var WorldStep=60;
var count=0;
var gameStarted=false;
var tankSize={"width":100,"height":40};
var ammoSize= new Array();
ammoSize[0]={"width":10,"height":10};
ammoSize[1]={"width":40,"height":12};
var missileEnation=85/SCALE;
var turnRate=0.7;
var teleportationTime=0.5*WorldStep;
var invisibleTime=5*WorldStep;
var nitroTime=2*WorldStep;

var velDel=1/SCALE;
var c=0;
function construct(){
    for(var i=99;i>=0;i--)
        ammofree.push(i);
}

function setMissileEnation(){
    missileEnation= (Math.sqrt(Math.pow((tankSize.width/2+ammoSize.width/2),2)+Math.pow((tankSize.height/2+ammoSize.height/2),2))+10)/SCALE;
    //console.log(missileEnation);
}
//setMissileEnation();
construct();


var   b2Vec2 = Box2D.Common.Math.b2Vec2
    , b2BodyDef = Box2D.Dynamics.b2BodyDef
    , b2Body = Box2D.Dynamics.b2Body
    , b2FixtureDef = Box2D.Dynamics.b2FixtureDef
    , b2Fixture = Box2D.Dynamics.b2Fixture
    , b2World = Box2D.Dynamics.b2World
    , b2MassData = Box2D.Collision.Shapes.b2MassData
    , b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
    , b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
    , b2DebugDraw = Box2D.Dynamics.b2DebugDraw
    , b2CircleDef=Box2D.Collision.Shapes.b2CircleDef
    ;

var world = new b2World(
    new b2Vec2(0, 0)    //gravity
    ,  true                 //allow sleep
);




var canvas={"width":720,"height":480};


var server = net.createServer(function (socket) {
    socket.setEncoding("utf8");

    //Send the Cross Domain Policy
    socket.write(writeCrossDomainFile() + '\0');


    //Due to old Flash Players, this listens for Flash to request
    //the Cross Domain Policy and then responds
    function on_policy_check(data) {
        /*
         socket.removeListener('data', on_policy_check);
         socket.on('data', function () {
         on_data(data)
         });
         */
        try {
            if(data == '<policy-file-request/>\0') {
                socket.write(writeCrossDomainFile()+"\0");

                //Send Join confirmation message
                /*
                 var duh={};
                 duh["info"]="join";
                 socket.write(JSON.stringify(duh)+"\0");
                 */
            }
            else {
                if(!gameStarted)
                    init();
                //console.log("data from flash:: = " + data);
                var ind=String(data).lastIndexOf("}");
                //console.log("index = " + ind);
                if(ind==-1)
                {   /*
                 mySocket.write(d);
                 sockets.splice(sockets.indexOf(mySocket),1);
                 mySocket.end();
                 */

                }else{
                    var trimmed =String(data).substr(0,ind+1);
                    buffer.push({"data":JSON.parse(trimmed),"playerSock":socket});
                    console.log("From Flash = " + JSON.parse(trimmed));
                }
            }
        }
        catch (ex) {
            console.log(ex);
        }
    }


    function Player(sockvar){

        var fixDef = new b2FixtureDef;
        fixDef.density = 1.0;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.2;
        fixDef.shape = new b2PolygonShape;
        var bodyDef = new b2BodyDef;
        bodyDef.type = b2Body.b2_dynamicBody;
        bodyDef.allowSleep = false;
        bodyDef.position.x = 100*(avl.length+1)/SCALE;
        bodyDef.position.y = 100*(avl.length+1)/SCALE;
        fixDef.shape.SetAsBox(tankSize.width/(2*SCALE),tankSize.height/(2*SCALE));

        var ass=world.CreateBody(bodyDef);
        //ass.SetAngularDamping(1);
        //ass.SetLinearVelocity(new b2Vec2(1,0));
        ass.CreateFixture(fixDef);
        //modelArray.body = ass;
        // the body
        this["body"]=ass;
        //current position
        this["position"]={"x":100*(avl.length+1)/SCALE,"y":100*(avl.length+1)/SCALE};
        //the final destined position
        this["final"]={"x":-1,"y":-1};
        //the movespeed
        this["ms"]=100/SCALE;
        //the hitpoints and regen
        this["hp"]=400;
        this["regen"]=1;
        //shield
        this["shield"]=false;
        //dimensions of the tank
        this["size"]=60/SCALE;
        //the socket variable of the player
        this["sock"]=sockvar;
        // acknowledge signal true=sent   false=waiting
        this["ack"]=true;
        //distance travelled by missile
        this["travelled"]=0;
        this["teleTime"]=0;
        this["invisTime"]=0;
        this["nitroTime"]=0;
    }

    function Ammo(xpos,ypos,type){
        var fixDef = new b2FixtureDef;
        fixDef.density = 100.0;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.2;
        fixDef.shape = new b2PolygonShape;
        var bodyDef = new b2BodyDef;
        bodyDef.type = b2Body.b2_dynamicBody;
        console.log(type);
        console.log(ammoSize[type].width);
        console.log(ammoSize[type].height);
        fixDef.shape.SetAsBox(ammoSize[type].width/(2*SCALE),ammoSize[type].height/(2*SCALE));
        bodyDef.position.x = xpos;
        bodyDef.position.y = ypos;
        bodyDef.allowSleep = false;
        var ass=world.CreateBody(bodyDef);
        ass.CreateFixture(fixDef);
        this["body"]=ass;
        /*type of ammo
         0=normal
         1=laser
         2=piercing
         3=cannon
         4=incendiary
         5=homing
         */
        this["type"]=-1;
        //from which player
        this["shooter"]=-1;
        //the movespeed
        this["ms"]=200/SCALE;
        //the damage
        this["dmg"]=45;
        // range
        this["dur"]=2.5*WorldStep;
        //dimensions of the bullet
        this["size"]=6/SCALE;
        // acknowledge signal true=sent   false=waiting
        this["ack"]=true;
        //current position
        this["position"]={"x":xpos,"y":ypos};
        //the final destined position
        this["final"]={"x":-1,"y":-1};
        //distance travelled by missile
        this["travelled"]=0;
    }


function getCos(id,isTank){
    if(isTank)
    {
        var b= playerArray[id].final.x-playerArray[id].body.GetPosition().x;
        var p=playerArray[id].final.y-playerArray[id].body.GetPosition().y;
    }else{
        var b= ammo[id].final.x-ammo[id].body.GetPosition().x;
        var p=ammo[id].final.y-ammo[id].body.GetPosition().y;
    }
    var h=Math.sqrt( b*b+p*p);
    return b/h;
}

function getSin(id,isTank){
    if(isTank)
    {
        var b= playerArray[id].final.x-playerArray[id].body.GetPosition().x;
        var p=playerArray[id].final.y-playerArray[id].body.GetPosition().y;
    }else{
        var b= ammo[id].final.x-ammo[id].body.GetPosition().x;
        var p=ammo[id].final.y-ammo[id].body.GetPosition().y;
    }
    var h=Math.sqrt( b*b+p*p);
    return p/h;
}

function getTan(id,isTank){
    if(isTank)
    {
        var b= playerArray[id].final.x-playerArray[id].body.GetPosition().x;
        var p=playerArray[id].final.y-playerArray[id].body.GetPosition().y;
    }else{
        var b= ammo[id].final.x-ammo[id].body.GetPosition().x;
        var p=ammo[id].final.y-ammo[id].body.GetPosition().y;
    }
    return b/p;
}

function readBuffer(queue){
    broadcastData();
    buffer=[];
    while(queue.length!=0)
    {   var firstReq=queue.shift();
        var data=firstReq["data"];
        //console.log(playerArray);
        console.log("data is:"+data);
        var sock=firstReq["playerSock"];
        //console.log("sock is:"+sock);
        if(data.info=="position")
        {   console.log("position buffer found..");
            playerArray[data.pid]["final"]["x"]=data.position.x/SCALE;
            playerArray[data.pid]["final"]["y"]=data.position.y/SCALE;
            //console.log(playerArray[data.pid].body.GetAngle());
            playerArray[data.pid].body.SetLinearDamping(0);
            var xdiff=playerArray[data.pid].final.x-playerArray[data.pid].body.GetPosition().x;
            var ydiff=playerArray[data.pid].final.y-playerArray[data.pid].body.GetPosition().y;
            console.log(180 * Math.atan2( ydiff,xdiff) / 3.141593);
            //playerArray[data.pid].body.SetAngle(45);
            playerArray[data.pid].body.SetAngle(180 * Math.atan2( ydiff,xdiff) / 3.141593);
            console.log(playerArray[data.pid].body.GetAngle());
            playerArray[data.pid].body.SetLinearVelocity(new b2Vec2( playerArray[data.pid]["ms"]*getCos(data.pid,true), playerArray[data.pid]["ms"]*getSin(data.pid,true)));
            //console.log(Math.atan(getTan(data.pid,true)));
            //playerArray[data.pid].body.SetAngle(Math.atan2((playerArray[data.pid].final.y-playerArray[data.pid].body.GetPosition().y)/(playerArray[data.pid].final.x-playerArray[data.pid].body.GetPosition().x)));
            //playerArray[data.pid].body.SetAngularVelocity(5*(Math.atan(getTan(data.pid,true))+playerArray[data.pid].body.GetAngle()*180/3.14));
            //playerArray[data.pid].body.SetAngularDamping(Math.abs((5*Math.atan(getTan(data.pid,true))+playerArray[data.pid].body.GetAngle()*180/3.14)/2));
            /*
            for (var bb = $(world.GetBodyList()); $[bb]!=null; bb = $[bb].m_next){
            //We process bb and realize it should be destroyed, so we call:
                //console.log(bb.GetUserData());
                //console.log($[bb].GetPosition());
                //console.log(bb.GetUserData());
                if($[bb].GetUserData()==data.pid)
                {   console.log(bb);
                    $[bb].SetLinearVelocity(new b2Vec2( playerArray[data.pid]["ms"]*getCos(data.pid,true), playerArray[data.pid]["ms"]*getSin(data.pid,true)));
                    //console.log(bb);
                }

            }


            playerArray[data.pid].body.ApplyImpulse(
                new b2Vec2( playerArray[data.pid]["ms"]*getCos(data.pid,true), playerArray[data.pid]["ms"]*getSin(data.pid,true)),
                playerArray[data.pid].body.GetWorldCenter()
            );
            */
            //playerArray[data.pid].body.ApplyForce(new b2Vec2(40,0),playerArray[data.pid].body.GetWorldCenter());
            //playerArray[data.pid].alter(new b2Vec2( playerArray[data.pid]["ms"]*getCos(data.pid,true), playerArray[data.pid]["ms"]*getSin(data.pid,true)));
            //playerArray[data.pid]["body"].linearVelocity=new b2Vec2( playerArray[data.pid]["ms"]*getCos(data.pid,true), playerArray[data.pid]["ms"]*getSin(data.pid,true));
            //console.log(playerArray[data.pid]["body"].GetLinearVelocity());
            //console.log(playerArray[data.pid]["body"].GetPosition());
            //console.log(playerArray[data.pid]["body"].GetLinearVelocity());
        }else if(data.info=="join"){
            var ind=free.pop();
            playerArray[ind]= new Player(sock);
            playerArray[ind].body.SetUserData(['tank',ind]);
            console.log("Player id"+ ind +" Connected...");

            var aData={};
            aData["info"]="player";
            aData["position"]={"x":playerArray[ind].body.GetPosition().x,"y":playerArray[ind].body.GetPosition().y};
            aData["angle"]=playerArray[ind].body.GetAngle();
            aData["pid"]=ind;
            aData["hp"]=playerArray[ind]["hp"];
            aData["ms"]=playerArray[ind]["ms"];
            aData["regen"]=playerArray[ind]["regen"];
            playerArray[ind]["sock"].write(JSON.stringify(aData)+"\0");

            for(var i=0;i<avl.length;i++)
            {   var data={};
                data["info"]="newjoin";
                data["position"]={"x":playerArray[ind].body.GetPosition().x,"y":playerArray[ind].body.GetPosition().y};
                data["angle"]=playerArray[ind].body.GetAngle();
                data["pid"]=ind;
                data["hp"]=playerArray[ind]["hp"];
                data["ms"]=playerArray[ind]["ms"];
                data["regen"]=playerArray[ind]["regen"];
                playerArray[avl[i]]["sock"].write(JSON.stringify(data)+"\0");

                var eData={};
                eData["info"]="newjoin";
                eData["position"]={"x":playerArray[avl[i]].body.GetPosition().x,"y":playerArray[avl[i]].body.GetPosition().y};
                eData["angle"]=playerArray[avl[i]].body.GetAngle();
                eData["pid"]=avl[i];
                eData["hp"]=playerArray[avl[i]]["hp"];
                eData["ms"]=playerArray[avl[i]]["ms"];
                eData["regen"]=playerArray[avl[i]]["regen"];
                playerArray[ind]["sock"].write(JSON.stringify(eData)+"\0");
            }
            avl.push(ind);
            console.log("avl array"+avl);
            console.log("free array"+free);

        }else if(data.info=="ammo")
        {   console.log("ammo buffer found..");
            //clearInterval(animationPointer[data.pid]);
            console.log(data.type);
            if(data.type==0)
            {
                var ind=ammofree.pop();
                console.log("missileEnation is "+missileEnation);
                var a=new Ammo(playerArray[data.pid].body.GetPosition().x+data.dir.cos*missileEnation,playerArray[data.pid].body.GetPosition().y+data.dir.sin*missileEnation,0);
                ammo[ind]=a;
                ammo[ind].body.SetUserData(['ammo',ind]);
                ammoavl.push(ind);
                console.log("ammoavl.."+ammoavl) ;
                console.log("ammofree.."+ammofree) ;
                a.body.SetAngle(180*Math.atan2(data.dir.sin,data.dir.cos)/3.14);
                a.body.SetLinearVelocity(new b2Vec2(data.dir.cos* a.ms,data.dir.sin* a.ms));
                a["type"]  =data.type;
                a["shooter"]=data.pid;

            }else if(data.type==1){
                var ind=ammofree.pop();
                var a=new Ammo(playerArray[data.pid].body.GetPosition().x+data.dir.cos*missileEnation,playerArray[data.pid].body.GetPosition().y+data.dir.sin*missileEnation,1);
                ammo[ind]=a;
                ammo[ind].body.SetUserData(['ammo',ind]);
                ammoavl.push(ind);
                console.log("ammoavl.."+ammoavl) ;
                console.log("ammofree.."+ammofree) ;
                a["type"]  =data.type;
                a["shooter"]=data.pid;
                a["ms"]=120/SCALE;
                a["dur"]=5*WorldStep;
                a["aim"]=data.aim;

            }else if(data.type==2){
                playerArray[data.pid]["body"].SetLinearVelocity(new b2Vec2(0,0));
                playerArray[data.pid]["teleTime"]=teleportationTime;
                playerArray[data.pid]["final"]["x"]=data.position.x/SCALE;
                playerArray[data.pid]["final"]["y"]=data.position.y/SCALE;
                var edata={};
                edata["info"]="teleportStarted";
                edata["pid"]=data.pid;
                for(var i=0;i<avl.length;i++)
                {
                    playerArray[avl[i]]["sock"].write(JSON.stringify(edata)+"\0");
                }
            }else if(data.type==3){
                playerArray[data.pid]["invisTime"]=invisibleTime;
                var edata={};
                edata["info"]="invisible";
                edata["time"]=invisibleTime;
                edata["pid"]=data.pid;
                console.log(edata);
                for(var i=0;i<avl.length;i++)
                {
                    playerArray[avl[i]]["sock"].write(JSON.stringify(edata)+"\0");
                }
            }else if(data.type==4){
                playerArray[data.pid]["nitroTime"]=nitroTime;
                playerArray[data.pid]["ms"]*=2;
                var xvel=  2*playerArray[data.pid]["body"].GetLinearVelocity().x;
                var yvel=  2*playerArray[data.pid]["body"].GetLinearVelocity().y;
                playerArray[data.pid]["body"].SetLinearVelocity(new b2Vec2(xvel,yvel));
            }
        }
    }
}


function broadcastData(){
    var data={};
    data["info"]="position";
    data["data"]=new Array();
    var c=0;

    var ammodata={};
    ammodata["info"]="ammo";
    ammodata["data"]=new Array();
    var d=0;

    for(var i=0;i<avl.length;i++)
    {   //console.log(playerArray[avl[i]]);

        //console.log(playerArray[avl[i]]["body"].GetPosition());
        if(playerArray[avl[i]].body.GetLinearVelocity().Length ()>=velDel )
        {   //console.log(" player data to be cast  !");
            //console.log("x is.."+playerArray[avl[i]]["body"].GetPosition().x) ;
            //console.log(playerArray[avl[i]].body.GetLinearVelocity()) ;
           // console.log(playerArray[avl[i]].body.GetPosition()) ;
            data["data"][c]={};
            data["data"][c]["position"]={"x":playerArray[avl[i]]["body"].GetPosition().x,"y":playerArray[avl[i]]["body"].GetPosition().y};
            data["data"][c]["angle"]=playerArray[avl[i]]["body"].GetAngle();
            data["data"][c]["pid"]=avl[i];
            c++;
            if(playerArray[avl[i]]["nitroTime"]>0)
            {
                playerArray[avl[i]]["nitroTime"]--;
                if(playerArray[avl[i]]["nitroTime"]==0) {
                console.log('nitro Ended');
                    playerArray[avl[i]]["ms"]/=2;
                    playerArray[avl[i]]["body"].SetLinearVelocity(new b2Vec2(playerArray[avl[i]]["body"].GetLinearVelocity().x/2,playerArray[avl[i]]["body"].GetLinearVelocity().y/2));
                }
            }

            if(playerArray[avl[i]]["final"]["x"]!=-1 && playerArray[avl[i]]["final"]["y"]!=-1 ){
                if(Math.abs(playerArray[avl[i]]["body"].GetPosition().x-playerArray[avl[i]]["final"]["x"])<=0.05 && Math.abs(playerArray[avl[i]]["body"].GetPosition().y-playerArray[avl[i]]["final"]["y"])<=0.05){
                    playerArray[avl[i]]["body"].SetLinearVelocity(new b2Vec2(0,0));
                    playerArray[avl[i]]["final"]["x"]=-1
                    playerArray[avl[i]]["final"]["y"]=-1
                }

            }

        }else{
            playerArray[avl[i]]["body"].SetLinearVelocity(new b2Vec2(0,0));
            playerArray[avl[i]].body.SetLinearDamping(0);
            if(playerArray[avl[i]]["teleTime"]>0){
            playerArray[avl[i]]["teleTime"]--;
            if(playerArray[avl[i]]["teleTime"]==0)
            {   console.log("teleport initiated");
                playerArray[avl[i]]["body"].SetPosition(new b2Vec2(playerArray[avl[i]]["final"]["x"],playerArray[avl[i]]["final"]["y"]));
                var edata={};
                edata["info"]="teleportEnded";
                edata["position"]={"x":playerArray[avl[i]].body.GetPosition().x,"y":playerArray[avl[i]].body.GetPosition().y};
                edata["pid"]=avl[i];
                for(var j=0;j<avl.length;j++)
                {
                    playerArray[avl[j]]["sock"].write(JSON.stringify(edata)+"\0");
                }
            }
        }
        }
        //console.log(playerArray[avl[i]]);
        if(playerArray[avl[i]]["invisTime"]>0)
        {
            playerArray[avl[i]]["invisTime"]--;
            if(playerArray[avl[i]]["invisTime"]==0)
            {
                var edata={};
                edata["info"]="visible";
                edata["pid"]=avl[i];
                for(var j=0;j<avl.length;j++)
                {
                    playerArray[avl[j]]["sock"].write(JSON.stringify(edata)+"\0");
                }
            }
        }
    }
    //console.log(ammo)  ;
    for(var i=0;i<ammoavl.length;i++)
    {   //console.log(ammoavl[i])  ;

        if(ammo[ammoavl[i]]["dur"]>0)
        {
            ammodata["data"][d]={};
            //console.log(ammoavl[i]);
            ammodata["data"][d]["pid"]=ammoavl[i];
            ammodata["data"][d]["type"]=ammo[ammoavl[i]].type;
            ammodata["data"][d]["position"]={"x":ammo[ammoavl[i]].body.GetPosition().x,"y":ammo[ammoavl[i]].body.GetPosition().y};
            if(ammo[ammoavl[i]].type==1)
                ammodata["data"][d]["angle"]=ammo[ammoavl[i]].body.GetAngle();
            d++;
            if(ammo[ammoavl[i]]["type"]==0)
            {
                //

            }else if(ammo[ammoavl[i]]["type"]==1)
            {   var xdiff=playerArray[ammo[ammoavl[i]]["aim"]].body.GetPosition().x-ammo[ammoavl[i]].body.GetPosition().x;
                var ydiff=playerArray[ammo[ammoavl[i]]["aim"]].body.GetPosition().y-ammo[ammoavl[i]].body.GetPosition().y;
                var hyp = Math.sqrt(xdiff*xdiff+ydiff*ydiff);
                ammo[ammoavl[i]].body.SetAngle(180*Math.atan2(ydiff,xdiff)/3.14);
                ammo[ammoavl[i]]["body"].SetLinearVelocity(new b2Vec2(xdiff*ammo[ammoavl[i]]["ms"]/hyp,ydiff*ammo[ammoavl[i]]["ms"]/hyp));
            }
            ammo[ammoavl[i]]["dur"]--;

        }else{
            ammo[ammoavl[i]].body.SetLinearVelocity(new b2Vec2(0,0));
            //console.log("ammo stopped !"+ammoavl.length);
            var dump={};
            dump["info"]="missilesLost";
            dump["pid"]=ammoavl[i];
            world.DestroyBody(ammo[ammoavl[i]].body);
            ammofree.push(ammoavl.splice(i,1)[0]);
            for(var j=0;j<avl.length;j++)
            {
                playerArray[avl[j]]["sock"].write(JSON.stringify(dump)+"\0");
            }
        }

    }

    if( data["data"].length>0){
        //console.log("broadcasting player data  !");
        for(var j=0;j<avl.length;j++)
        {   //console.log("numclients "+avl.length);
            playerArray[avl[j]]["sock"].write(JSON.stringify(data)+"\0");
        }
        // console.log("at time::"+count*100);
    }

    if( ammodata["data"].length>0){
        //console.log("broadcasting ammo data  !");
        for(var j=0;j<avl.length;j++)
        {   //console.log("num clients "+avl.length);
            //console.log(JSON.stringify(ammodata));
            playerArray[avl[j]]["sock"].write(JSON.stringify(ammodata)+"\0");
        }
        // console.log("at time::"+count*100);
    }


}


function init() {
    gameStarted=true;
    var fixDef = new b2FixtureDef;
    fixDef.density = 1.0;
    fixDef.friction = 0.5;
    fixDef.restitution = 0.2;
    fixDef.shape = new b2PolygonShape;

    var bodyDef = new b2BodyDef;
    //create ground
    bodyDef.type = b2Body.b2_staticBody;

    var bdy;

    // positions the center of the object (not upper left!)
    bodyDef.position.x = canvas.width / 2 / SCALE;
    bodyDef.position.y = (canvas.height / SCALE) ;
    fixDef.shape.SetAsBox((canvas.width / SCALE) / 2, 0.5 / 2);
    bdy=world.CreateBody(bodyDef);
    bdy.SetUserData('wall');
    bdy.CreateFixture(fixDef);
    //////////////////////////////////////////////////////////
    bodyDef.position.x = canvas.width / 2 / SCALE;
    bodyDef.position.y = 0;
    fixDef.shape.SetAsBox((canvas.width / SCALE) / 2, 0.5 / 2);
    bdy=world.CreateBody(bodyDef);
    bdy.SetUserData('wall');
    bdy.CreateFixture(fixDef);
    ////////////////////////////////////////////////////////
    bodyDef.position.x = 0;
    bodyDef.position.y = (canvas.height /2/ SCALE);
    fixDef.shape.SetAsBox(0.5/ 2, (canvas.width / SCALE) / 2);
    bdy=world.CreateBody(bodyDef);
    bdy.SetUserData('wall');
    bdy.CreateFixture(fixDef);
    ///////////////////////////////////////////////////////////
    bodyDef.position.x = (canvas.width / SCALE);
    bodyDef.position.y = (canvas.height / 2/SCALE);
    fixDef.shape.SetAsBox(0.5/ 2, (canvas.width / SCALE) / 2);
    bdy=world.CreateBody(bodyDef);
    bdy.SetUserData('wall');
    bdy.CreateFixture(fixDef);
    ///////////////////////////////////////////////////////////////




    var listener = new Box2D.Dynamics.b2ContactListener;


    //////////////////////////            ONCONTACT LISTENER            ///////////////////////////////////////////////////
    listener.BeginContact = function(contact) {
        var body1=contact.GetFixtureA().GetBody();
        var body2=contact.GetFixtureB().GetBody()
        if(body1.GetUserData()[0]=="ammo"){
            //console.log("ammoavl"+ammoavl);
            //console.log("ammofree"+ammofree);
            var dump={};
            dump["info"]="missilesLost";
            //console.log(body1.GetUserData()[1]);
            dump["pid"]=body1.GetUserData()[1];
            console.log(parseInt(body1.GetUserData()[1]));
            for(var i=0;i<ammoavl.length;i++)
                console.log(ammoavl[i]);
            console.log("index in ammoavl "+ammoavl.indexOf(parseInt(body1.GetUserData()[1])));
            //console.log("index in ammoavl "+ammoavl.indexOf(parseInt(body1.GetUserData()[1])));
            //retIndex(body2.GetUserData()[1])>-1?(ammofree.push(ammoavl.splice(retIndex(body2.GetUserData()[1]),1)[0])):console.log("index not found");
            world.DestroyBody(body1);
            //ammofree.push(ammoavl.splice(ammoavl.indexOf(body1.GetUserData()[1]),1)[0]);
            //console.log("ammoavl"+ammoavl);
            //console.log("ammofree"+ammofree);
            for(var j=0;j<avl.length;j++)
            {      console.log(JSON.stringify(dump));
                playerArray[avl[j]]["sock"].write(JSON.stringify(dump)+"\0");
            }
        }else if(body1.GetUserData()[0]=="tank"){

        }else{
        //wall
        }

        if(body2.GetUserData()[0]=="ammo"){
            //console.log("ammoavl"+ammoavl);
            //console.log("ammofree"+ammofree);
            var dump={};
            dump["info"]="missilesLost";
            dump["pid"]=body2.GetUserData()[1];
            //console.log("index in ammoavl "+ammoavl.indexOf(parseInt(body1.GetUserData()[1])));
            console.log(parseInt(body1.GetUserData()[1]));
            for(var i=0;i<ammoavl.length;i++)
                console.log(ammoavl[i]);
            console.log("index in ammoavl "+ammoavl.indexOf(parseInt(body1.GetUserData()[1])));
            //retIndex(body2.GetUserData()[1])>-1?(ammofree.push(ammoavl.splice(retIndex(body2.GetUserData()[1]),1)[0])):console.log("index not found");
            world.DestroyBody(body2);
            //ammofree.push(ammoavl.splice(ammoavl.indexOf(body2.GetUserData()[1]),1)[0]);
            //console.log("ammoavl"+ammoavl);
            //console.log("ammofree"+ammofree);
            for(var j=0;j<avl.length;j++)
            {   console.log(JSON.stringify(dump));
                playerArray[avl[j]]["sock"].write(JSON.stringify(dump)+"\0");
            }
        }else if(body2.GetUserData()[0]=="tank"){

        }else{
            //wall
        }


        //console.log(contact.GetFixtureA().GetBody().GetPosition());
        //console.log(contact.GetFixtureB().GetBody().GetPosition());


    }


    //////////////////////////            ONLeaveCONTACT LISTENER            ///////////////////////////////////////////////////
    listener.EndContact = function(contact) {




        contact.GetFixtureA().GetBody().SetLinearDamping(2);
        contact.GetFixtureB().GetBody().SetLinearDamping(2);



    }


    //////////////////////////            IMPULSE LISTENER            ///////////////////////////////////////////////////
    listener.PostSolve = function(contact, impulse) {

    }


    //////////////////////////            REDUNADANT LISTENER            ///////////////////////////////////////////////////
    listener.PreSolve = function(contact, oldManifold) {

    }



    world.SetContactListener(listener);
    //setup debug draw
    /*
     var debugDraw = new b2DebugDraw();
     debugDraw.SetSprite(document.getElementById("c").getContext("2d"));
     debugDraw.SetDrawScale(SCALE);
     debugDraw.SetFillAlpha(0.3);
     debugDraw.SetLineThickness(1.0);
     debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
     world.SetDebugDraw(debugDraw);
     */
    setInterval(update, 1000 / WorldStep);
    // restart
    //setTimeout(init, 3000);

}; // init()

  function retIndex(val){
      var flag=-1;
      for(var i=0;i<ammoavl.length;i++)
      {
          if(ammoavl[i]==val)
            flag=i;
      }
      return flag;
  }

function update() {
    readBuffer(buffer);
    world.Step(
        1 / WorldStep   //frame-rate
        ,  8       //velocity iterations
        ,  3       //position iterations
    );
    world.DrawDebugData();
    world.ClearForces();


    /*
    if(playerArray[0]["body"].GetLinearVelocity().Length()>0)        {
    console.log("x is.."+playerArray[0]["body"].GetPosition().x) ;
    console.log("y is.."+playerArray[0]["body"].GetPosition().y) ;
    }

             */


    //stats.update();
    //update();
};

    function onDisconnect(from) {
        //console.log("the disconnect code is .."+from);
        var data={};
        for(var i=0;i<avl.length;i++)
        {
            if(playerArray[avl[i]]["sock"]==socket)
            {   console.log(playerArray);
                console.log(ammo);
                data["info"]="left";
                data["pid"]=avl[i];
                free.push(avl[i]);
                console.log("Player id"+ avl[i] +" Disconnected...");
                avl.splice(i,1);
                for(var j=0;j<avl.length;j++)
                    playerArray[avl[j]]["sock"].write(JSON.stringify(data)+"\0");
                console.log("avl array"+avl);
                console.log("free array"+free);
            }
        }

        socket.end();

    }

    function onError(from){
        console.log("the error code is .."+from);
    }
    /*
     function on_data(dat) {
     onData(dat,socket);
     }
     */
    socket.on('data', on_policy_check);
    socket.on("error", function(exception) {onError(exception)});
    //socket.on("timeout",onDisconnect("timeout") );
    socket.on("close", function(exception) {onDisconnect(exception)});

});
server.listen(9001, "25.89.188.115");

function writeCrossDomainFile()
{
    var xml = '<?xml version="1.0"?>\n<!DOCTYPE cross-domain-policy SYSTEM'
    xml += ' "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">';
    xml += '\n<cross-domain-policy>\n';
    xml += '<allow-access-from domain="*" to-ports="*"/>\n';
    xml += '</cross-domain-policy>\n';

    return xml;
}



