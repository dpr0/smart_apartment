Serial2.setup(115200,                   {rx: A3, tx: A2});
Serial3.setup(9600,                     {rx: P0, tx: P1});
var power  =                                          A4 ;
var pot    = require('@amperka/pot'         ).connect(A0);
var temp1  = require('@amperka/thermometer' ).connect(A1);
var sensor = require('@amperka/light-sensor').connect(A5);
var rele   = require('@amperka/relay'       ).connect(P2);
var led    = require('@amperka/led'         ).connect(P3);
var btn    = require('@amperka/button'      ).connect(P4);
var buz    = require('@amperka/buzzer'      ).connect(P5);
var ir     = require('@amperka/ir-receiver' ).connect(P7);
var sonic  = require('@amperka/ultrasonic'  ).connect({ trigPin: P10, echoPin: P11 });
var servo  = require('@amperka/servo'       ).connect(P13);
var http   = require("http");
var wifi   = require('@amperka/wifi').setup(Serial2, function(err) {
  wifi.connect('wifi', 'password', function(err) {});
  wifi.getIP(function(err, ip)       { console.log("ip:", ip); });
  wifi.getVersion(function(err, ver) { console.log('version:', ver); });
});

function check_co2() {
  Serial3.write("\xFF\x01\x86\x00\x00\x00\x00\x00\x79");
  var data = Serial3.read(9);
  var a = []; for (i=0; i < data.length; i++) { a.push(data.charCodeAt(i)); }
  var co2 = a[2] * 256 + a[3]; var temp2 = a[4]-40; var luxes = sensor.read('lx'); var angle = 270 * pot.read() - 135;
  var dist = sonic.ping(function errval(err, val) { val.toFixed(0);}, 'mm');
  var crc = (256-(a[1]+a[2]+a[3]+a[4]+a[5]+a[6]+a[7])%256) == a[8];
  // var crc = (256-(a.slice(1, 8).reduce((p, v) => p + v))%256) == a[8];
  var hash = {status: crc, co2: co2, temp1: temp1.read('C').toFixed(0),
              temp2: temp2, luxes: luxes.toFixed(0), angle: angle.toFixed(0), dist: dist};
  return hash;
}

function start() {
  var httpServer = http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.write(JSON.stringify(check_co2()));
    response.end();
  });
  httpServer.listen(80);
}

setTimeout(function() { check_co2(); }, 2000);
setInterval(start, 10000);

var brightness = 0;
var fade_step = 0.05;
setInterval(function(){
  analogWrite(power, brightness);
  brightness += fade_step;
  if (brightness <= 0 || brightness >= 1) { fade_step = -fade_step; }
}, 30);

btn.on('press',   function() { buz.turnOn(); });
btn.on('release', function() { buz.turnOff(); });
btn.on('click',   function() { 
  servo.write(180 * pot.read());
  check_co2();
});