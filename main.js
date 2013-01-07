/**
 * Created with JetBrains WebStorm.
 * User: karan.chhabra
 * Date: 14/12/12
 * Time: 4:42 PM
 * To change this template use File | Settings | File Templates.
 */
//with great proness comes an imba application

var net = require('net');
var game=require('./game.js');
var buffer=[];
var rooms=[];
var serverStarted=false;
function room(roomId){
    this.roomId=roomId;
    this.users=[];
    this.reference= new game();
}

var server = net.createServer(function (socket) {
    socket.setEncoding("utf8");

    //Send the Cross Domain Policy
    socket.write(writeCrossDomainFile() + '\0');


    //Due to old Flash Players, this listens for Flash to request
    //the Cross Domain Policy and then responds
    function on_policy_check(data) {
        console.log('on data');
        /*
         socket.removeListener('data', on_policy_check);
         socket.on('data', function () {
         on_data(data)
         });
         */
        try {
            if(data == '<policy-file-request/>\0') {
                console.log('on policy check');
                socket.write(writeCrossDomainFile()+"\0");

                //Send Join confirmation message
                /*
                 var duh={};
                 duh["info"]="join";
                 socket.write(JSON.stringify(duh)+"\0");
                 */
            }
            else {
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
                    readBuffer(buffer);
                    /*
                    if(!serverStarted)
                    {
                        serverStarted=true;
                        setInterval(readBuffer(buffer),100);
                    }
                    */
                }
            }
        }
        catch (ex) {
            console.log(ex);
        }
    }

    function onDisconnect(from) {

           for(var i=0;i<rooms.length;i++)
           {    if(rooms[i]!=null)
                {
                    rooms[i].reference.removePlayer(socket);
                    if(rooms[i].reference.numPlayers()<1)
                        rooms[i]=null;
                }
           }
        //console.log("the disconnect code is .."+from);

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
    var xml = '<?xml version="1.0"?>\n<!DOCTYPE cross-domain-policy SYSTEM "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">';
    xml += '\n<cross-domain-policy>\n';
    xml += '<allow-access-from domain="*" to-ports="*"/>\n';
    xml += '</cross-domain-policy>\n';

    return xml;
}

function readBuffer(queue){
    console.log("read buffer");
    buffer=[];
    while(queue.length!=0)
    {   var firstReq=queue.shift();
        var data=firstReq["data"];
        //console.log(playerArray);
        console.log("data is:"+data.info);
        var sock=firstReq["playerSock"];
        //console.log("sock is:"+sock);
        if(data.info=="findGames")
        {
            console.log("roomList message..");
            readRooms(sock);

        }else if(data.info=="createRoom")
        {
            console.log("createRoom message..");
            var ind=Math.abs(1000*Math.random());
            rooms.push(new room(ind));
            //sock.store.set('room', rooms.length-1, function(){});
            var obj={};
            obj.info="joinOk";
            obj.roomId=rooms.length-1;
            //obj.roomId=ind;
            sock.write(JSON.stringify(obj)+"\0");

        }else if(data.info=="joinRoom")
        {   var roomToJoin=-1;
            console.log("joinRoom message..");
            if(rooms[data.roomId]!=null && rooms[data.roomId].reference.numPLayers()<6)
            {
                var obj={};
                obj.info="joinOk";
                obj.roomId=data.roomId;
                //obj.roomId=ind;
                sock.write(JSON.stringify(obj)+"\0");
            }else{
                var obj={};
                obj.info="joinKo";
                //obj.roomId=ind;
                sock.write(JSON.stringify(obj)+"\0");
            }
        }else{
            if(rooms[data.roomId]!=null && data.roomId!=-1)
                rooms[data.roomId].reference.loadBuffer(firstReq);
        }
    }
}

function readRooms(sockvar){
    var payload={};
    payload.info="rmList";
    payload.data=new Array();
    c=0;
    console.log("roomlength is::"+rooms.length);
    for(var i=0;i<rooms.length;i++)
    {
        if(rooms[i]!=null){
        payload.data[c]={};
        payload.data[c].id=i;
        payload.data[c].data=rooms[i].reference.getPlayers();
        c++;
        }
    }
        sockvar.write(JSON.stringify(payload)+"\0");

}


