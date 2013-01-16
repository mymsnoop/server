var net = require('net');
var numPlayers=0;
var playerArray=new Array();
var avl=new Array();
var free=[5,4,3,2,1,0];
var buffer=[];
var animationPointer=new Array();
var SPEED=100;
var started=false;
var gameStep;
var timeStep=100;
var count=0;
var gameStarted=false;
var arena={"width":720,"height":500};
var unit={"width":30,"height":30};


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
                        //console.log("From Flash = " + JSON.parse(trimmed));
                }
            }
        }
        catch (ex) {
            console.log(ex);
        }
    }

    function onDisconnect() {
        var data={};
        for(var i=0;i<avl.length;i++)
        {
            if(playerArray[avl[i]]["sock"]==socket)
            {
                data["info"]="left";
                data["pid"]=avl[i];
                free.push(avl[i]);
                console.log("Player id"+ avl[i] +" Disconnected...");
                avl.splice(i,1);
            }
        }
            for(var j=0;j<avl.length;j++)
                playerArray[avl[j]]["sock"].write(JSON.stringify(data)+"\0");
        socket.end();
        console.log("avl array"+avl);
        console.log("free array"+free);
    }
    /*
    function on_data(dat) {
        onData(dat,socket);
    }
    */
    socket.on('data', on_policy_check);
    socket.on("error", onDisconnect);
    socket.on("timeout",onDisconnect );
    socket.on("close", onDisconnect);

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
    //the unique id of a player on that arena
    //this["id"]=numPlayers++;
    //current position
    this["position"]={"x":100*numPlayers,"y":100*numPlayers};
    //the final destined position
    this["final"]={"x":100*numPlayers,"y":100*numPlayers};
    // the x and y steps used update position incrementally
    this["xStep"]=0;
    this["yStep"]=0;
    this["steps"]=-1;
    //the movespeed
    this["ms"]=100;
    //the hitpoints and regen
    this["hp"]=400;
    this["regen"]=1;
    //the socket variable of the player
    this["sock"]=sockvar;
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
    updatePosition();
    buffer=[];
    while(queue.length!=0)
    {   var firstReq=queue.shift();
        var data=firstReq["data"];
        //console.log("data is:"+data);
        var sock=firstReq["playerSock"];
        //console.log("sock is:"+sock);
        if(data.info=="position")
        {   //console.log("position buffer found..");
            //clearInterval(animationPointer[data.pid]);
            playerArray[data.pid]["final"]["x"]=data.position.x;
            playerArray[data.pid]["final"]["y"]=data.position.y;
            var numTimes=parseInt((calculateTime(playerArray[data.pid]["position"]["x"],playerArray[data.pid]["position"]["y"],data.position.x,data.position.y))*10);
            playerArray[data.pid]["steps"]=numTimes;
            //console.log("number of times is :"+numTimes);
            //playerArray[data.pid]["animCount"]=numTimes;
            //playerArray[data.pid]["isChanged"] =true;
            playerArray[data.pid]["xStep"]=(data.position.x-playerArray[data.pid]["position"]["x"])/numTimes;
            playerArray[data.pid]["yStep"]=(data.position.y-playerArray[data.pid]["position"]["y"])/numTimes;
            //animationPointer[data.pid]=setInterval(function(){updatePosition(data.pid,xInc,yInc)},100);
        }else if(data.info=="join"){

            var p=new Player(sock);
            var ind=free.pop();

            playerArray[ind]=p;
            console.log("Player id"+ ind +" Connected...");

            var aData={};
            aData["info"]="playerId";
            aData["position"]={"x":playerArray[ind]["position"]["x"],"y":playerArray[ind]["position"]["y"]};
            aData["pid"]=ind;
            playerArray[ind]["sock"].write(JSON.stringify(aData)+"\0");

            for(var i=0;i<avl.length;i++)
            {   var data={};
                data["info"]="newjoin";
                data["position"]={"x":playerArray[avl[i]]["position"]["x"],"y":playerArray[avl[i]]["position"]["y"]};
                data["pid"]=ind;
                playerArray[i]["sock"].write(JSON.stringify(data)+"\0");

                var eData={};
                eData["info"]="newjoin";
                eData["position"]={"x":playerArray[avl[i]]["position"]["x"],"y":playerArray[avl[i]]["position"]["y"]};
                eData["pid"]=avl[i];
                playerArray[ind]["sock"].write(JSON.stringify(eData)+"\0");
            }
            avl.push(ind);
            console.log("avl array"+avl);
            console.log("free array"+free);

        }else if(data.info=="playerJoin"){
            //
        }
    }
}

function updatePosition(){
   // console.log("unit width !"+unit.width);

    for(var i=0;i<avl.length;i++)
    {
        if(playerArray[avl[i]]["steps"]>0)
        {
            playerArray[avl[i]]["position"]["x"]+=playerArray[avl[i]]["xStep"];
            playerArray[avl[i]]["position"]["y"]+=playerArray[avl[i]]["yStep"];
            playerArray[avl[i]]["steps"]--;
            //console.log("x:"+playerArray[id]["position"]["x"]+" & y:"+playerArray[id]["position"]["y"]);
            if(playerArray[avl[i]]["position"]["x"]>arena.width || playerArray[avl[i]]["position"]["x"]<0)
                playerArray[avl[i]]["position"]["x"]-=playerArray[avl[i]]["xStep"];
            if(playerArray[avl[i]]["position"]["y"]>arena.height || playerArray[avl[i]]["position"]["y"]<0)
                playerArray[avl[i]]["position"]["y"]-=playerArray[avl[i]]["yStep"];
        }
    }
     /*
    for(var j=0;j<numPlayers-1;j++)
    {
        for(var k=j+1;k<numPlayers;k++)
        {
            if(checkCollision(j,k))
            {
                playerArray[j]["steps"]=0;
                playerArray[j]["xStep"]=0;
                playerArray[j]["yStep"]=0;
                playerArray[k]["steps"]=0;
                playerArray[k]["xStep"]=0;
                playerArray[k]["yStep"]=0;
            }
        }
    }
    */

    broadcastData();
}

function checkCollision(id1,id2){
    var isCollision=false;
    var xdiff=playerArray[id1]["position"]["x"]-playerArray[id2]["position"]["x"];
    var ydiff=playerArray[id1]["position"]["y"]-playerArray[id2]["position"]["y"];
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
    if(Math.abs(xdiff)<unit.width && Math.abs(ydiff)<unit.height)
    {
        isCollision=true;

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

    }
    return isCollision;
}

function broadcastData(){
    var data={};
    data["info"]="position";
    data["data"]=new Array();
    var c=0;
	for(var i=0;i<avl.length;i++)
    {
        if(playerArray[avl[i]]["steps"]>=0)
        {   data["data"][c]={};
            data["data"][c]["position"]={"x":playerArray[avl[i]]["position"]["x"],"y":playerArray[avl[i]]["position"]["y"]};
            data["data"][c]["pid"]=avl[i];
            c++;
            if(playerArray[avl[i]]["steps"]==0)
                playerArray[avl[i]]["steps"]=-1;
        }
    }
    if( data["data"].length>0){
        for(var j=0;j<avl.length;j++)
        {   //console.log("socket "+(j+1)+":"+playerArray[j]["sock"]);
            playerArray[avl[j]]["sock"].write(JSON.stringify(data)+"\0");
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

function calculateTime(x1,y1,x2,y2){
    var time=(Math.sqrt(Math.pow((x1-x2),2)+Math.pow((y1-y2),2)))/SPEED;
    console.log("time to run:"+time);
    return time;
}



