var net = require('net');
var numPlayers=0;
var playerArray=new Array();
var buffer=[];
var animationPointer=new Array();
var SPEED=100;
var started=false;
var gameStep;

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
                startGame();
                console.log("data from flash:: = " + data);
                var ind=String(data).lastIndexOf("}");
                console.log("index = " + ind);
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
    /*
    function on_data(dat) {
        onData(dat,socket);
    }
    */
    socket.on('data', on_policy_check);
    socket.on("error", function (exception) {
        socket.end();
    });

    socket.on("timeout", function () {
        for(var i=0;i<playerArray.length;i++)
        {
            if(playerArray[i]["sock"]==socket)
                playerArray.splice(i,1);
        }
        socket.end();
    });

    socket.on("close", function (had_error) {
        socket.end();
    });
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
    this["id"]=numPlayers++;
    this["position"]={"x":100*numPlayers,"y":100*numPlayers};
    this["animCount"]=0;
    this["sock"]=sockvar;
    this["isChanged"] =false;
    this["lastSent"]="";
    this["animation"];
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
    broadcastData();
    buffer=[];
    //console.log("reading buffer..");
    while(queue.length!=0)
    {   var firstReq=queue.shift();
        var data=firstReq["data"];
        console.log("data is:"+data);
        var sock=firstReq["playerSock"];
        console.log("sock is:"+sock);
        if(data.info=="position")
        {   //console.log("position buffer found..");
            //clearInterval(animationPointer[data.pid]);
            var numTimes=parseInt((calculateTime(playerArray[data.pid]["position"]["x"],playerArray[data.pid]["position"]["y"],data.position.x,data.position.y))*10);
            //console.log("number of times is :"+numTimes);
            playerArray[data.pid]["animCount"]=numTimes;
            playerArray[data.pid]["isChanged"] =true;
            var xInc=(data.position.x-playerArray[data.pid]["position"]["x"])/numTimes;
            var yInc=(data.position.y-playerArray[data.pid]["position"]["y"])/numTimes;
            playerArray[data.pid]["animation"]=setInterval(function(){updatePosition(data.pid,xInc,yInc)},100);
            console.log("animation pointer.."+playerArray[data.pid]["animation"]);
        }else if(data.info=="join"){

            var p=new Player(sock);
            playerArray.push(p);
            console.log("Player id"+ p["id"] +" Connected...");
            console.log("Player pos"+ p["position"]["x"] +" Connected...");
            console.log("Player "+ numPlayers +" Connected...");

            var aData={};
            aData["info"]="playerId";
            aData["position"]={"x":playerArray[playerArray.length-1]["position"]["x"],"y":playerArray[playerArray.length-1]["position"]["y"]};
            aData["pid"]=playerArray[playerArray.length-1]["id"];
            playerArray[playerArray.length-1]["sock"].write(JSON.stringify(aData)+"\0");

            for(var i=0;i<playerArray.length-1;i++)
            {   var data={};
                data["info"]="newjoin";
                data["position"]={"x":playerArray[playerArray.length-1]["position"]["x"],"y":playerArray[playerArray.length-1]["position"]["y"]};
                data["pid"]=playerArray[playerArray.length-1]["id"];
                playerArray[i]["sock"].write(JSON.stringify(data)+"\0");

                var eData={};
                eData["info"]="newjoin";
                eData["position"]={"x":playerArray[i]["position"]["x"],"y":playerArray[i]["position"]["y"]};
                eData["pid"]=playerArray[i]["id"];
                playerArray[playerArray.length-1]["sock"].write(JSON.stringify(eData)+"\0");
            }

        }else if(data.info=="playerJoin"){
            //
        }
    }
}

function updatePosition(id,xinc,yinc){
    //console.log("updating position!");
    playerArray[id]["position"]["x"]+=xinc;
    playerArray[id]["position"]["y"]+=yinc;
    playerArray[id]["animCount"]--;
    console.log("x:"+playerArray[id]["position"]["x"]+"&y:"+playerArray[id]["position"]["y"]);
    if(playerArray[id]["animCount"]<=0)
    {
        clearInterval(playerArray[id]["animation"]);
        playerArray[id]["isChanged"]=false;
        console.log("Updation Stopped!");
        console.log("Final Position is x:"+playerArray[id]["position"]["x"]+" y:"+playerArray[id]["position"]["y"]);
    }
}

function broadcastData(){
    var data={};
    data["info"]="position";
    data["data"]=new Array();
	for(var i=0;i<playerArray.length;i++)
    {
        if(playerArray[i]["isChanged"])
        {   data["data"][i]={};
            data["data"][i]["position"]={"x":playerArray[i]["position"]["x"],"y":playerArray[i]["position"]["y"]};
            data["data"][i]["pid"]=playerArray[i]["id"];
        }
    }
    if( data["data"].length>0){
        for(var j=0;j<playerArray.length;j++)
        {   console.log("socket "+(j+1)+":"+playerArray[j]["sock"]);
            playerArray[j]["sock"].write(JSON.stringify(data)+"\0");

        }
    }
}

function startGame(){
    console.log("Game Started");
    //setTimeout(function(){clearTimeout(gameStep)},60000);
    gameStep=setInterval(function(){readBuffer(buffer)},100);
}

function calculateDistance(x1,y1,x2,y2){
return Math.sqrt(Math.pow((x1-x2),2)+Math.pow((y1-y2),2));
}

function calculateTime(x1,y1,x2,y2){
    var time=(Math.sqrt(Math.pow((x1-x2),2)+Math.pow((y1-y2),2)))/SPEED;
    console.log("time to run:"+time);
    return time;
}



