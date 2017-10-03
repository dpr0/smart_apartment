Serial2.setup(115200, {rx: A3, tx: A2});
var pkey   = A4;
var http   = require('http'                 );
var pot    = require('@amperka/pot'         ).connect(A0);
var temp2  = require('@amperka/thermometer' ).connect(A1);
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
var info1  = {status: false,
              co2:    0,
              temp1:  0,
              temp2:  0,
              luxes:  0,
              angle:  0,
              dist:   0,
              cooler: false};
var info2  = {link:   dweet.follow(),
              ip:      '',
              key:     '',
              request: '',
              ver:     ''};
var wifi   = require('@amperka/wifi').setup(Serial2, function(err) {
    wifi.connect('essid', 'password', function(err) {
        wifi.getIP(     function(err, ip ) { print('ip:',  ip);  info2.ip  = ip;  });
        wifi.getVersion(function(err, ver) { print('ver:', ver); info2.ver = ver; });
        server.listen(80);
    });
});
var server = http.createServer(function(request, response) {
    info2.request = request.url;
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(info1));
});
mhz19.abc_off();
function check_data() {
    data         = mhz19.read();
    info1.status = data.status;
    info1.temp2  = temp2.read('C');
    info1.angle  = pot.read();
    info1.luxes  = sensor.read('lx');
    //info1.dist = sonic.ping(errval(), 'mm');
    if (data.status) { info1.co2    = data.co2;
        info1.temp1  = data.temp;
        dweet.send(Object.assign(info1, info2)); }
    return info1;
}

setInterval(check_data, 15000);

function ir_func(code, repeat) {
    if (repeat) { return; }
    info2.key = code;
    print(code.toString());
    if (code === 378097839) { analogWrite(pkey, false);                  } // up left
    if (code === 378101919) {                                            } // up
    if (code === 378099879) { analogWrite(pkey, true);                   } // up right
    if (code === 378081519) { info1.angle -= 1; servo.write(info1.angle);} // left
    if (code === 378091719) {                                            } // play
    if (code === 378116199) { info1.angle += 1; servo.write(info1.angle);} // right
    if (code === 378083559) { print(mhz19.read());                       } // down left
    if (code === 378124359) { print(info1);                              } // down
    if (code === 378085599) { print(info2);                              } // down right
    if (code === 378130479) {                                            } // on/off
    if (code === 378132519) { rele.turnOn();  info1.cooler = true;       } // +
    if (code === 378134559) { rele.turnOff(); info1.cooler = false;      } // -
}
ir.on('receive', ir_func);

btn.on('press',   function() { buz.turnOn(); });
btn.on('release', function() { buz.turnOff(); });
btn.on('click',   function() { print(Object.assign(info1, info2)); });

