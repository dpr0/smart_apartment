Serial2.setup(115200, {rx: A3, tx: A2});
//Serial3.setup(9600,   {rx: P0, tx: P1});
angle  = 90;
var hash   = {status: '', co2: '', temp1: '', temp2: '', luxes: '', angle: '', dist: '', cooler: '', ip: ''};
var pkey   = A4;
var http   = require('http'                 );
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
var dweet  = require('@amperka/dweetio'     ).connect('dweet_dpro');
var mhz19  = require('https://github.com/dpr0/smart_apartment/blob/master/mhz19.js').connect();
// var server = require('@amperka/server'      ).create();
var server = http.createServer(function(request, response) {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(hash));
});
var wifi   = require('@amperka/wifi'        ).setup(Serial2, function(err) {
    wifi.connect('essid', 'password', function(err) {
        wifi.getIP(     function(err, ip ) { hash.ip = ip; });
        wifi.getVersion(function(err, ver) { print('version:', ver); });
        print('dweet link:', dweet.follow());
        server.listen(80);
    });
});

function check_co2() {
    Serial3.write("\xFF\x01\x86\x00\x00\x00\x00\x00\x79");
    data = Serial3.read(9); a = [];
    for (i=0; i < data.length; i++) { a.push(data.charCodeAt(i)); }
    hash.status = (256 - (a[1] + a[2] + a[3] + a[4] + a[5] + a[6] + a[7])%256) == a[8];
    console.log(hash.status);
    if (!hash.status) { return; }
    hash.co2    = a[2] * 256 + a[3];
    hash.temp1  = temp1.read('C').toFixed(0);
    hash.temp2  = a[4]-40;
    hash.luxes  = sensor.read('lx').toFixed(0);
    hash.angle  = (270 * pot.read() - 135).toFixed(0);
    hash.dist   = 1; //sonic.ping(errval(), 'mm');
    wifi.getIP(function(err, ip) { hash.ip = ip; });
    if (hash.status) { dweet.send(hash); }
    print(hash);
}

function ir_func(code, repeat) {
    if (repeat)  { return; }
    print(code.toString());
    if (code === 378097839) { analogWrite(pkey, false); hash.cooler = false; } // up left
    if (code === 378101919) { print(mhz19.read());            } // up
    if (code === 378099879) { analogWrite(pkey, true); hash.cooler = true; } // up right
    if (code === 378081519) { angle -= 10; servo.write(angle); } // left
    if (code === 378091719) {                                 } // play
    if (code === 378116199) { angle += 10; servo.write(angle); } // right
    if (code === 378083559) { servo.write(0);                 } // down left
    if (code === 378124359) { servo.write(90);                } // down
    if (code === 378085599) { servo.write(180);               } // down right
    if (code === 378130479) { check_co2();                    } // on/off
    if (code === 378132519) { rele.turnOn();                  } // +
    if (code === 378134559) { rele.turnOff();                 } // -
}

btn.on('press',   function() { buz.turnOn();  });
btn.on('release', function() { buz.turnOff(); });
btn.on('click',   print(hash) );
ir.on('receive', ir_func);
// server.on('/', function(req, res) {res.send(hash);});
// setInterval(check_co2(), 10000);
