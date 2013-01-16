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

//this is the buffer that gets read every timestep
var buffer=[];

//the room array storing rooms and corresponding info
var rooms=[];

var serverStarted=false;

// room stacks  ,, available and used room stacks
var avlRooms=[0,1,2,3,4,5];
var roomsUsed=new Array();

function room(roomId,name,pwd){
    // room id is the unique id from 0-5
    this.roomId=roomId;

    // the reference to the associated room, all the game functions are invoked using this
    this.reference= new game();

    // room name, if a new custom room is created
    if(name!=""){
        this.roomName=name;
    }else{
        this.roomName="admin";
    }

    // the password for the room, if a password is set
    if(pwd!=""){
        this.pwd=pwd;
    }else{
        this.pwd="admin";
    }
}


//create the socket server to respond to incoming connections
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
            }
            else {
                //console.log("data from flash:: = " + data);
                var ind=String(data).lastIndexOf("}");
                //console.log("index = " + ind);
                if(ind==-1)
                {   //ignore any bullshit message

                }else{

                    var trimmed =String(data).substr(0,ind+1);
                    buffer.push({"data":JSON.parse(trimmed),"playerSock":socket});
                    console.log("From Flash = " + JSON.parse(trimmed));
                    //read the data stored in the read buffer
                    readBuffer(buffer);
                }
            }
        }
        catch (ex) {
            console.log(ex);
        }
    }


    //on socket disconnect
    function onDisconnect(from) {

           for(var i=0;i<roomsUsed.length;i++)
           {    if(rooms[roomsUsed[i]]!=null)
                {
                   rooms[roomsUsed[i]].reference.removePlayer(socket);
                    //check if the room is empty after the disconnect
                   if(rooms[roomsUsed[i]].reference.numPlayers()<1)
                   {   console.log("room empty");
                       //clear the room from the room array
                       rooms[roomsUsed[i]]=null;
                       var index=  roomsUsed.indexOf(roomsUsed[i]);
                       console.log(avlRooms);
                       console.log(roomsUsed);
                       console.log("index is:"+index);
                       if(index>-1)
                       {
                           avlRooms.push(roomsUsed[i]);
                           roomsUsed.splice(index,1);
                       }
                       console.log(avlRooms);
                       console.log(roomsUsed);
                   }
                }
           }
        //console.log("the disconnect code is .."+from);

        socket.end();

    }


    //on socket error
    function onError(from){
        console.log("the error code is .."+from);
    }

    //socket listeners
    socket.on('data', on_policy_check);
    socket.on("error", function(exception) {onError(exception)});
    //socket.on("timeout",onDisconnect("timeout") );
    socket.on("close", function(exception) {onDisconnect(exception)});


});
server.listen(9001, "127.0.0.1"); //ip and port for the socket server


//write the crossdomain xml to bypass the flash socket security concerns
function writeCrossDomainFile()
{
    var xml = '<?xml version="1.0"?>\n<!DOCTYPE cross-domain-policy SYSTEM "http://www.macromedia.com/xml/dtds/cross-domain-policy.dtd">';
    xml += '\n<cross-domain-policy>\n';
    xml += '<allow-access-from domain="*" to-ports="*"/>\n';
    xml += '</cross-domain-policy>\n';

    return xml;
}


/*reads the data sent by the client and sends it to the respective room / transacts info
    /////handshakes
    joinOk=join him to the desired room
    joinKo=disallow him to join the room

    /////////////error codes for creation and join
    100=room limit reached,cannot create more rooms
    101=tried to join a nonexistent room
    102=room full,cannot join

*/

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
        if(data.info=="roomList")
        {
            console.log("roomList message..");
            readRooms(sock);

        }else if(data.info=="createRoom")
        {   //create room message
            console.log("createRoom message..");
            if(avlRooms.length>0){
                //if the rooms are available
                var ind=avlRooms.pop();
                roomsUsed.push(ind);
                rooms[ind]=new room(ind,data.arenaName,data.password);

                //send affirmation to the client
                var obj={};
                obj.info="joinOk";
                obj.roomId=ind
                sock.write(JSON.stringify(obj)+"\0");

            }else{

                var obj={};
                obj.info="joinKo";
                // 100 = cannot create rooms.Maximum rooms being used
                obj.extra=100;
                //obj.roomId=ind;
                sock.write(JSON.stringify(obj)+"\0");
            }

        }else if(data.info=="joinRoom")
        {   var roomToJoin=-1;
            console.log("joinRoom message..");
            if(rooms[data.roomId]!=null)
            {   if(rooms[data.roomId].reference.numPlayers()<6)
                {
                    var obj={};
                    obj.info="joinOk";
                    obj.roomId=data.roomId;
                    //obj.roomId=ind;
                    sock.write(JSON.stringify(obj)+"\0");
                }else{
                    var obj={};
                    obj.info="joinKo";
                    //101= room full
                    obj.extra=102;
                    sock.write(JSON.stringify(obj)+"\0");
                }
            }else{
                var obj={};
                obj.info="joinKo";
                //101=non existent room
                obj.extra=101;
                sock.write(JSON.stringify(obj)+"\0");
            }
        }else{
            if(rooms[data.roomId]!=null && data.roomId!=-1)
                rooms[data.roomId].reference.loadBuffer(firstReq);
        }
    }
}


// read the room array and all the player data with the rooms
function readRooms(sockvar){
    var payload={};
    payload.info="rmList";
    payload.rooms=new Array();
    console.log(payload)    ;
    var c=0;
    for(var i=0;i<roomsUsed.length;i++)
    {
        if(rooms[roomsUsed[i]]!=null)
        {   payload.rooms[c]={};
            payload.rooms[c].roomId=rooms[roomsUsed[i]].roomId;
            payload.rooms[c].players=rooms[roomsUsed[i]].reference.getPlayers();
            c++;
        }
    }
    console.log(payload);
     sockvar.write(JSON.stringify(payload)+"\0");
}


