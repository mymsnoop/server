var net = require('net');
var playerArray=new Array();
var ammo=new Array();
var ammoavl=new Array();
var ammofree=new Array();
var avl=new Array();
var free=[5,4,3,2,1,0];
var buffer=[];
var gameStep;
var timeStep=100;
var count=0;
var gameStarted=false;
var arena={"width":720,"height":500};
var unit={"width":30,"height":30};
var turnRate=0.7;
var teleportationTime=10;
var invisibleTime=50;
var nitroTime=20;
construct();

function construct(){
    for(var i=99;i>=0;i--)
        ammofree.push(i);
}

// create the server and register event listeners
var net = require('net');

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
                    startGame();
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
server.listen(9001, "127.0.0.1");

function writeCrossDomainFile()
{
    var xml = '<?xml version="1.0"?>\n<!DOCTYPE cross-domain-policy SYSTEM'
    xml += ' "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">';
    xml += '\n<cross-domain-policy>\n';
    xml += '<allow-access-from domain="*" to-ports="*"/>\n';
    xml += '</cross-domain-policy>\n';

    return xml;
}

function Player(sockvar){

    //current position
    this["position"]={"x":100*(avl.length+1),"y":100*(avl.length+1)};
    //the final destined position
    this["final"]={"x":100*(avl.length+1),"y":100*(avl.length+1)};
    // the x and y steps used update position incrementally
    this["xStep"]=0;
    this["yStep"]=0;
    this["steps"]=0;
    //the movespeed
    this["ms"]=100;
    //the hitpoints and regen
    this["hp"]=400;
    this["regen"]=1;
    //shield
    this["shield"]=false;
    //dimensions of the tank
    this["size"]=15;
    //the socket variable of the player
    this["sock"]=sockvar;
    // acknowledge signal true=sent   false=waiting
    this["ack"]=true;
    //distance travelled by missile
    this["travelled"]=0;
    this["teleportation"]=false;
    this["invisibleTime"]=0;
    this["nitroTime"]=0;
}

function Ammo(){
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
    //current position
    this["position"]={"x":100*(avl.length+1),"y":100*(avl.length+1)};
    //the final destined position
    this["dir"]={"cos":100*(avl.length+1),"sin":100*(avl.length+1)};
    // the x and y steps used update position incrementally
    this["xStep"]=0;
    this["yStep"]=0;
    this["steps"]=-1;
    //the movespeed
    this["ms"]=200;
    //the damage
    this["dmg"]=45;
    // range
    this["rng"]=500;
    //dimensions of the bullet
    this["size"]=2.5;
    // acknowledge signal true=sent   false=waiting
    this["ack"]=true;

    //distance travelled by missile
    this["travelled"]=0;
}

// When flash sends us data, this method will handle it
/*
function onData(d,sock)
{   console.log("data from flash:: = " + d);
    var ind=String(d).lastIndexOf("}");
    console.log("index = " + ind);
    if(ind==-1)
    {

    }else{
        if(started)
        {
            var trimmed =String(d).substr(0,String(d).lastIndexOf("}")+1);
            buffer.push({"data":JSON.parse(trimmed),"playerSock":sock});
            console.log("From Flash = " + JSON.parse(trimmed));
        }else{
            console.log("Game not started yet..");
        }
    }
}

*/
function readBuffer(queue){
    count++;

    buffer=[];
    while(queue.length!=0)
    {   var firstReq=queue.shift();
        var data=firstReq["data"];
        //console.log(playerArray);
        //console.log("data is:"+data);
        var sock=firstReq["playerSock"];
        //console.log("sock is:"+sock);
        if(data.info=="position")
        {   console.log("position buffer found..");
            //clearInterval(animationPointer[data.pid]);
            playerArray[data.pid]["final"]["x"]=data.position.x;
            playerArray[data.pid]["final"]["y"]=data.position.y;
            var numTimes=parseInt((calculateTime(playerArray[data.pid]["position"]["x"],playerArray[data.pid]["position"]["y"],data.position.x,data.position.y,data.pid))*1000/timeStep);
            playerArray[data.pid]["steps"]=numTimes;
            playerArray[data.pid]["xStep"]=(data.position.x-playerArray[data.pid]["position"]["x"])/numTimes;
            playerArray[data.pid]["yStep"]=(data.position.y-playerArray[data.pid]["position"]["y"])/numTimes;
            playerArray[data.pid]["ack"]=false;
        }else if(data.info=="join"){

            var p=new Player(sock);
            var ind=free.pop();

            playerArray[ind]=p;
            console.log("Player id"+ ind +" Connected...");

            var aData={};
            aData["info"]="player";
            aData["position"]={"x":playerArray[ind]["position"]["x"],"y":playerArray[ind]["position"]["y"]};
            aData["pid"]=ind;
            aData["hp"]=playerArray[ind]["hp"];
            aData["ms"]=playerArray[ind]["ms"];
            aData["regen"]=playerArray[ind]["regen"];
            playerArray[ind]["sock"].write(JSON.stringify(aData)+"\0");

            for(var i=0;i<avl.length;i++)
            {   var data={};
                data["info"]="newjoin";
                data["position"]={"x":playerArray[ind]["position"]["x"],"y":playerArray[ind]["position"]["y"]};
                data["pid"]=ind;
                data["hp"]=playerArray[ind]["hp"];
                data["ms"]=playerArray[ind]["ms"];
                data["regen"]=playerArray[ind]["regen"];
                playerArray[avl[i]]["sock"].write(JSON.stringify(data)+"\0");

                var eData={};
                eData["info"]="newjoin";
                eData["position"]={"x":playerArray[avl[i]]["position"]["x"],"y":playerArray[avl[i]]["position"]["y"]};
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
            var a=new Ammo();
            var ind=ammofree.pop();
            ammo[ind]=a;
            ammoavl.push(ind);
            console.log("ammoavl.."+ammoavl) ;
            console.log("ammofree.."+ammofree) ;
            a["type"]  =data.type;
            a["shooter"]=data.pid;
            a["position"]["x"]=data.position.x;
            a["position"]["y"]=data.position.y;
            a["dir"]["cos"]=data.dir.cos;
            a["dir"]["sin"]=data.dir.sin;
            a["xStep"]=data.dir.cos*a["ms"]*timeStep/1000;
            a["yStep"]=data.dir.sin*a["ms"]*timeStep/1000;
            a["steps"]=a["rng"]*1000/(timeStep*a["ms"]);
            a["ack"]=false;
            //console.log("shooter.."+a["shooter"]) ;
            //console.log("xStep.."+a["xStep"]) ;
            //console.log("yStep.."+a["yStep"]) ;
            //console.log("steps.."+a["steps"]) ;
            }else if(data.type==1){
                var a=new Ammo();
                var ind=ammofree.pop();
                ammo[ind]=a;
                ammoavl.push(ind);
                console.log("ammoavl.."+ammoavl) ;
                console.log("ammofree.."+ammofree) ;
                a["type"]  =data.type;
                a["shooter"]=data.pid;
                a["position"]["x"]=data.position.x;
                a["position"]["y"]=data.position.y;
                a["rng"]=700;
                a["aim"]=data.aim;
                a["travelled"]=0;
                a["ack"]=false;
                //console.log("shooter.."+a["shooter"]) ;
                //console.log("xStep.."+a["xStep"]) ;
                //console.log("yStep.."+a["yStep"]) ;
                //console.log("steps.."+a["steps"]) ;
            }else if(data.type==2){
                playerArray[data.pid]["steps"]=teleportationTime;
                playerArray[data.pid]["xStep"]=data.position.x-playerArray[data.pid]["position"]["x"];
                playerArray[data.pid]["yStep"]=data.position.y-playerArray[data.pid]["position"]["y"];
                playerArray[data.pid]["teleportation"]=true;
                var edata={};
                edata["info"]="teleport";
                edata["position"]={"x":data.position.x,"y":data.position.y};
                edata["pid"]=data.pid;
                for(var i=0;i<avl.length;i++)
                {
                     playerArray[avl[i]]["sock"].write(JSON.stringify(edata)+"\0");
                }
            }else if(data.type==3){
                playerArray[data.pid]["invisibleTime"]=invisibleTime;
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
                playerArray[data.pid]["xStep"]*=2;
                playerArray[data.pid]["yStep"]*=2;
                playerArray[data.pid]["ms"]*=2;
                playerArray[data.pid]["steps"]/=2;
                var edata={};
                edata["info"]="nitro";
                edata["time"]=nitroTime;
                edata["pid"]=data.pid;
                console.log(edata);
            }
        }
    }
    updatePosition();
}

function updatePosition(){
    //console.log("in update  !");
    broadcastData();
    for(var i=0;i<avl.length;i++)
    {
        if(playerArray[avl[i]]["nitroTime"]>0){
            playerArray[avl[i]]["nitroTime"]--;
            if(playerArray[avl[i]]["nitroTime"]==0)
            {
                playerArray[avl[i]]["ms"]/=2;
                playerArray[avl[i]]["xStep"]/=2;
                playerArray[avl[i]]["yStep"]/=2;
                playerArray[avl[i]]["steps"]*=2;
            }
        }

        if(playerArray[avl[i]]["steps"]>0)
        {   console.log("in player update  !");
            playerArray[avl[i]]["steps"]--;

            if(playerArray[avl[i]]["teleportation"]==false){
            playerArray[avl[i]]["position"]["x"]+=playerArray[avl[i]]["xStep"];
            playerArray[avl[i]]["position"]["y"]+=playerArray[avl[i]]["yStep"];
            }else{
                if(playerArray[avl[i]]["steps"]==0)
                {
                    playerArray[avl[i]]["position"]["x"]+=playerArray[avl[i]]["xStep"];
                    playerArray[avl[i]]["position"]["y"]+=playerArray[avl[i]]["yStep"];
                    playerArray[avl[i]]["teleportation"]=false;
                    playerArray[avl[i]]["steps"]=-1;
                    playerArray[avl[i]]["xStep"]=0;
                    playerArray[avl[i]]["yStep"]=0;
                }
            }


            //console.log("x:"+playerArray[id]["position"]["x"]+" & y:"+playerArray[id]["position"]["y"]);
            if(playerArray[avl[i]]["position"]["x"]>arena.width || playerArray[avl[i]]["position"]["x"]<0)
                playerArray[avl[i]]["position"]["x"]-=playerArray[avl[i]]["xStep"];
            if(playerArray[avl[i]]["position"]["y"]>arena.height || playerArray[avl[i]]["position"]["y"]<0)
                playerArray[avl[i]]["position"]["y"]-=playerArray[avl[i]]["yStep"];
        }
        /*
        if(playerArray[data.pid]["invisibleTime"] >0)
        {
            playerArray[data.pid]["invisibleTime"]--;
            if(playerArray[data.pid]["invisibleTime"]==0)
            {
                var gg={};
                gg["info"]="visible";
                gg["pid"]=data.pid;
                for(var i=0;i<avl.length;i++)
                {
                    playerArray[avl[i]]["sock"].write(JSON.stringify(gg)+"\0");
                }
            }
        }
        */
    }

    for(var i=0;i<ammoavl.length;i++)
    {   console.log("ammoavl length.."+ammoavl.length);
        //console.log("unit width !"+unit.width);
        if(ammo[ammoavl[i]]["type"]==0)
        {
            if(ammo[ammoavl[i]]["steps"]>0)
            {   console.log("in ammo update  !");
                ammo[ammoavl[i]]["position"]["x"]+=ammo[ammoavl[i]]["xStep"];
                ammo[ammoavl[i]]["position"]["y"]+=ammo[ammoavl[i]]["yStep"];
                ammo[ammoavl[i]]["steps"]--;
                console.log("ammo x !"+ammo[ammoavl[i]]["position"]["x"]);
                console.log("ammo y !"+ammo[ammoavl[i]]["position"]["y"]);
                console.log("ammo steps !"+ammo[ammoavl[i]]["steps"]);
                //console.log("x:"+playerArray[id]["position"]["x"]+" & y:"+playerArray[id]["position"]["y"]);
                /*
                if(ammo[ammoavl[i]]["position"]["x"]>arena.width || ammo[ammoavl[i]]["position"]["x"]<0)
                    ammo[ammoavl[i]]["position"]["x"]-=ammo[ammoavl[i]]["xStep"];
                if(ammo[ammoavl[i]]["position"]["y"]>arena.height || ammo[ammoavl[i]]["position"]["y"]<0)
                    ammo[ammoavl[i]]["position"]["y"]-=ammo[ammoavl[i]]["yStep"];
                    */

            }
        }else if(ammo[ammoavl[i]]["type"]==1)
        {   console.log("travelled  !"+ammo[ammoavl[i]]["travelled"]);
            console.log("range !"+ammo[ammoavl[i]]["rng"]);
            if(ammo[ammoavl[i]]["travelled"]<ammo[ammoavl[i]]["rng"])
            {   //console.log("in ammo update  !");
                var xdiff= playerArray[ammo[ammoavl[i]]["aim"]]["position"]["x"]-ammo[ammoavl[i]]["position"]["x"];
                var ydiff= playerArray[ammo[ammoavl[i]]["aim"]]["position"]["y"]-ammo[ammoavl[i]]["position"]["y"];
                console.log("x tank.."+playerArray[ammo[ammoavl[i]]["aim"]]["position"]["x"]);
                console.log("y tank.."+playerArray[ammo[ammoavl[i]]["aim"]]["position"]["y"]);
                var dist=Math.sqrt(xdiff*xdiff+ydiff*ydiff);
                console.log("distance.."+dist);
                ammo[ammoavl[i]]["xStep"]=turnRate*xdiff/dist;
                ammo[ammoavl[i]]["yStep"]=turnRate*ydiff/dist;
                console.log("xStep.."+ammo[ammoavl[i]]["xStep"]);
                console.log("yStep.."+ammo[ammoavl[i]]["yStep"]);
                ammo[ammoavl[i]]["xStep"]=ammo[ammoavl[i]]["ms"] * ammo[ammoavl[i]]["xStep"] / 10;
                ammo[ammoavl[i]]["yStep"]=ammo[ammoavl[i]]["ms"] * ammo[ammoavl[i]]["yStep"] / 10;

                var moveStep= Math.sqrt(ammo[ammoavl[i]]["xStep"]*ammo[ammoavl[i]]["xStep"]+ammo[ammoavl[i]]["yStep"]*ammo[ammoavl[i]]["yStep"]);
                ammo[ammoavl[i]]["travelled"]+=moveStep;
                console.log("xStep updated.."+ammo[ammoavl[i]]["xStep"]);
                console.log("yStep updated.."+ammo[ammoavl[i]]["yStep"]);
                ammo[ammoavl[i]]["position"]["x"]+=ammo[ammoavl[i]]["xStep"];
                ammo[ammoavl[i]]["position"]["y"]+=ammo[ammoavl[i]]["yStep"];

                //ammo[ammoavl[i]]["steps"]--;
                console.log("ammo x !"+ammo[ammoavl[i]]["position"]["x"]);
                console.log("ammo y !"+ammo[ammoavl[i]]["position"]["y"]);
                //console.log("ammo steps !"+ammo[ammoavl[i]]["steps"]);
                //console.log("x:"+playerArray[id]["position"]["x"]+" & y:"+playerArray[id]["position"]["y"]);
                /*
                 if(ammo[ammoavl[i]]["position"]["x"]>arena.width || ammo[ammoavl[i]]["position"]["x"]<0)
                 ammo[ammoavl[i]]["position"]["x"]-=ammo[ammoavl[i]]["xStep"];
                 if(ammo[ammoavl[i]]["position"]["y"]>arena.height || ammo[ammoavl[i]]["position"]["y"]<0)
                 ammo[ammoavl[i]]["position"]["y"]-=ammo[ammoavl[i]]["yStep"];
                 */

            }else{
                console.log("range exceeded  !");
            }
        }

    }

    var tanksBumped=new Array();

    for(var j=0;j<avl.length-1;j++)
    {
        for(var k=j+1;k<avl.length;k++)
        {
            if(checkCollision(playerArray[avl[j]],playerArray[avl[k]]))
            {   //console.log("collision between tanks.."+avl[j]+"&"+avl[k]);
                playerArray[avl[j]]["position"]["x"]-=playerArray[avl[j]]["xStep"];
                playerArray[avl[j]]["position"]["y"]-=playerArray[avl[j]]["yStep"];
                playerArray[avl[k]]["position"]["x"]-=playerArray[avl[k]]["xStep"];
                playerArray[avl[k]]["position"]["y"]-=playerArray[avl[k]]["yStep"];
                playerArray[avl[j]]["steps"]=0;
                playerArray[avl[j]]["xStep"]=0;
                playerArray[avl[j]]["yStep"]=0;
                playerArray[avl[k]]["steps"]=0;
                playerArray[avl[k]]["xStep"]=0;
                playerArray[avl[k]]["yStep"]=0;
                tanksBumped.push(avl[j]);
                tanksBumped.push(avl[k]);
            }
        }
    }

    var missilesLost=new Array();
    var tanksHurt=new Array();

    for(var j=0;j<ammoavl.length-1;j++)
    {
        for(var k=j+1;k<ammoavl.length;k++)
        {
            if(checkCollision(ammo[ammoavl[j]],ammo[ammoavl[k]]))
            {   console.log("collision between ammo.."+ammoavl[j]+"&"+ammoavl[k]);
                missilesLost.push(ammoavl[j]);
                missilesLost.push(ammoavl[k]);
                ammofree.push(ammoavl.splice(j,1)[0]);
                ammofree.push(ammoavl.splice(k,1)[0]);
                break;
            }
        }
    }

    for(var j=0;j<avl.length;j++)
    {
        for(var k=0;k<ammoavl.length;k++)
        {
            if(checkCollision(playerArray[avl[j]],ammo[ammoavl[k]]))
            {   console.log("collision between tank and ammo.."+avl[j]+"&"+ammoavl[k]);
                missilesLost.push(ammoavl[k]);
                ammofree.push(ammoavl.splice(k,1)[0]);
                playerArray[j]["hp"]-=ammo[k]["dmg"];
                if(playerArray[j]["hp"]<=0)
                {

                    break;
                }
            }
        }
    }
    if(missilesLost.length>0)
    {
        var data={};
        data["info"]="missilesLost";
        data["data"]=new Array();
        while(missilesLost.length>0)
        {
            data["data"].push(missilesLost.pop());
        }
        for(var j=0;j<avl.length;j++)
        {   //console.log("socket "+(j+1)+":"+playerArray[j]["sock"]);
            playerArray[avl[j]]["sock"].write(JSON.stringify(data)+"\0");
        }
    }

    if(tanksHurt.length>0)
    {
        var data={};
        data["info"]="tanksHurt";
        data["data"]={};
        while(tanksHurt.length>0)
        {   var ind=tanksHurt.pop();
            data["data"][ind]=playerArray[ind]["hp"];
        }
        for(var j=0;j<avl.length;j++)
        {   //console.log("socket "+(j+1)+":"+playerArray[j]["sock"]);
            playerArray[avl[j]]["sock"].write(JSON.stringify(data)+"\0");
        }
    }

}



function broadcastData(){
    var data={};
    var ammodata={};
    ammodata["info"]="ammo";
    ammodata["data"]=new Array();
    data["info"]="position";
    data["data"]=new Array();
    var c=0;
    var d=0;
	for(var i=0;i<avl.length;i++)
    {
        if(playerArray[avl[i]]["steps"]>=0 && playerArray[avl[i]]["teleportation"]==false)
        {   console.log(" player data to be cast  !");
            data["data"][c]={};
            //data["data"][c]["position"]={"x":playerArray[avl[i]]["final"]["x"],"y":playerArray[avl[i]]["final"]["y"]};
            data["data"][c]["position"]={"x":playerArray[avl[i]]["position"]["x"],"y":playerArray[avl[i]]["position"]["y"]};
            data["data"][c]["xStep"]=playerArray[avl[i]]["xStep"];
            data["data"][c]["yStep"]=playerArray[avl[i]]["yStep"];
            data["data"][c]["pid"]=avl[i];
            c++;
            if(playerArray[avl[i]]["steps"]<=0)
                playerArray[avl[i]]["steps"]--;
            //playerArray[avl[i]]["ack"]=true
        }
    }
    //console.log(ammo)  ;
    for(var i=0;i<ammoavl.length;i++)
    {   //console.log(ammoavl[i])  ;
        //console.log(ammo[ammoavl[i]])  ;
            if(ammo[ammoavl[i]]["type"]==0)
            {
                if(ammo[ammoavl[i]]["steps"]>=0)
                {   console.log(" ammo data to be cast !");
                    ammodata["data"][d]={};
                    ammodata["data"][d]["pid"]=ammoavl[i];
                    ammodata["data"][d]["position"]={"x":ammo[ammoavl[i]]["position"]["x"],"y":ammo[ammoavl[i]]["position"]["y"]};
                    ammodata["data"][d]["xStep"]=ammo[ammoavl[i]]["xStep"];
                    ammodata["data"][d]["yStep"]=ammo[ammoavl[i]]["yStep"];
                    //ammodata["data"][d]["ms"]=ammo[ammoavl[i]]["ms"];
                    //ammodata["data"][d]["range"]=ammo[ammoavl[i]]["rng"];
                    d++;
                    //ammo[ammoavl[i]]["ack"]=true
                    if(ammo[ammoavl[i]]["steps"]<=0)
                    {
                        ammofree.push(ammoavl.splice(i,1)[0]);
                        console.log("ammo stopped !"+ammoavl.length);
                        var dump={};
                        dump["info"]="";
                    }
                }
            }else if(ammo[ammoavl[i]]["type"]==1)
            {
                    if(ammo[ammoavl[i]]["travelled"]<ammo[ammoavl[i]]["rng"] && ammo[ammoavl[i]]["travelled"]!=0)
                    {
                        console.log(" ammo data to be cast !");
                        ammodata["data"][d]={};
                        ammodata["data"][d]["pid"]=ammoavl[i];
                        ammodata["data"][d]["position"]={"x":ammo[ammoavl[i]]["position"]["x"],"y":ammo[ammoavl[i]]["position"]["y"]};
                        ammodata["data"][d]["xStep"]=ammo[ammoavl[i]]["xStep"];
                        ammodata["data"][d]["yStep"]=ammo[ammoavl[i]]["yStep"];
                        //ammodata["data"][d]["ms"]=ammo[ammoavl[i]]["ms"];
                        //ammodata["data"][d]["range"]=ammo[ammoavl[i]]["rng"];
                        d++;
                        //ammo[ammoavl[i]]["ack"]=true

                    }else if(ammo[ammoavl[i]]["travelled"]>=ammo[ammoavl[i]]["rng"])
                    {
                        ammofree.push(ammoavl.splice(i,1)[0]);
                        console.log("ammo stopped !"+ammoavl.length);
                        var dump={};
                        dump["info"]="";
                    }

            }

    }
    if( data["data"].length>0){
        console.log("broadcasting player data  !");
        for(var j=0;j<avl.length;j++)
        {   console.log("numclients "+avl.length);
            playerArray[avl[j]]["sock"].write(JSON.stringify(data)+"\0");
        }
       // console.log("at time::"+count*100);
    }

    if( ammodata["data"].length>0){
        console.log("broadcasting ammo data  !");
        for(var j=0;j<avl.length;j++)
        {   console.log("num clients "+avl.length);
            playerArray[avl[j]]["sock"].write(JSON.stringify(ammodata)+"\0");
        }
        // console.log("at time::"+count*100);
    }
}

function startGame(){
    console.log("Game Started");
    gameStarted=true;
    //setTimeout(function(){clearTimeout(gameStep)},60000);
    gameStep=setInterval(function(){readBuffer(buffer)},timeStep);
}

function calculateDistance(x1,y1,x2,y2){
return Math.sqrt(Math.pow((x1-x2),2)+Math.pow((y1-y2),2));
}

function calculateTime(x1,y1,x2,y2,id){
    var time=(Math.sqrt(Math.pow((x1-x2),2)+Math.pow((y1-y2),2)))/playerArray[id]["ms"];
    console.log("time to run:"+time);
    return time;
}

function checkCollision(u1,u2){
    var isCollision=false;
    var xdiff=u1["position"]["x"]-u2["position"]["x"];
    var ydiff=u1["position"]["y"]-u2["position"]["y"];
    /*
     var bumpinX=Math.abs(Math.abs(xdiff)-unit.width);
     var bumpinY=Math.abs(Math.abs(ydiff)-unit.height);
     var xstep1=playerArray[id1]["xStep"];
     var xstep2=playerArray[id2]["xStep"];
     var ystep1=playerArray[id1]["yStep"];
     var ystep2=playerArray[id2]["yStep"];
     var denx=Math.abs(xstep1)+Math.abs(xstep2);
     var deny=Math.abs(ystep1)+Math.abs(ystep2);
     var del=1.5;
     //console.log("x gap::"+xdiff);
     //console.log("y gap::"+ydiff);
     */
    var dist= Math.sqrt(xdiff*xdiff+ydiff*ydiff);
    //console.log("dist is::"+dist);
    if(dist<=u1["size"]+u2["size"])
    {
        isCollision=true;
        /*
         if(xstep1*xstep2>=0)
         {
         if(Math.abs(xstep1)>Math.abs(xstep2))
         {   console.log("1st xnudged");
         playerArray[id1]["position"]["x"]-=xstep1*del;
         }
         else{
         console.log("2nd xnudged");
         playerArray[id2]["position"]["x"]-=xstep2*del;
         }
         }else{
         console.log("1st xnudged");
         console.log("2nd xnudged");
         playerArray[id1]["position"]["x"]-=xstep1/denx*del;
         playerArray[id2]["position"]["x"]-=xstep2/denx*del;
         }

         if(ystep1*ystep2>=0)
         {
         if(Math.abs(ystep1)>Math.abs(ystep2)){
         console.log("1st ynudged");
         playerArray[id1]["position"]["y"]-=ystep1*del;
         }
         else{
         console.log("2nd ynudged");
         playerArray[id2]["position"]["y"]-=ystep2*del;
         }
         }else{
         console.log("1st ynudged");
         console.log("2nd ynudged");
         playerArray[id1]["position"]["y"]-=ystep1/deny*del;
         playerArray[id2]["position"]["y"]-=ystep2/deny*del;
         }
         */
    }
    return isCollision;
}

