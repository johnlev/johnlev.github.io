var sketchProc=function(processingInstance){ with (processingInstance) { size(300, 300);frameRate(24);

(function() {
"use strict";


var WINDOW_SIZE = 300

// Mock out Program.settings(), which is available on Khan Academy,
// and will be used to embed the program as a step-by-step exercise

// Sub in these mock settings if you want to simulate step1/2/3 settings

if (!Program) {
    var Program = {
        runTest: function() {},
        restart: function() {},
        settings: function() { return {}; }
    };
}
// Load in sprites library if not already available
var sprites = loadSpriteLibrary(processingInstance);

// Fisher–Yates Shuffle http://bost.ocks.org/mike/shuffle/
var shuffle = function(array) {
    var currentIndex = array.length, temporaryValue, randomIndex ;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

//Globals Variables
var maxValue = 30;
var values = (function(){
    var array = [];
    for (var i = 1; i <= maxValue; i++) {
        array.push(i);
    }
    return array;
})();
var objectsOld = shuffle(values);
var objects = [];
for (var i = 0; i < objectsOld.length; i++) {
    objects[i] = objectsOld[i];
}
var bars = [];
//Global Constants
var BAR_AREA_WIDTH = WINDOW_SIZE/objects.length;
var BAR_BUFFER_SIZE = BAR_AREA_WIDTH / 5;

//============Underneath Hood=========

var barSprite = sprites.extend(sprites.Sprite, {
	// This is a sprite of a single bar in a bar graph. It uses the Global Constants that have the word BAR
	init: function(obj) {
		//Hight of the bar
		var hight = (WINDOW_SIZE - 10) / objects.length * obj.number
		sprites.Sprite.init.call(this, "Bar Sprite " + str(obj.number || "-unknown-"), obj.x, WINDOW_SIZE, BAR_AREA_WIDTH, hight);
		this.number = obj.number;
        this.switching = false;
		scene.add(this);
	},

	draw: function() {
		//Draw the rectangle, color: Blue, width = area - buffer * 2, hight corresponding to number
        stroke(0, 255, 0);
        strokeWeight(1);
		fill(0, 255, 0);
        if (this.switching) {
            fill(255, 0, 0);
            stroke(255, 0, 0)
        }
		rect(this.x + BAR_BUFFER_SIZE, this.h, this.w - BAR_BUFFER_SIZE * 2, WINDOW_SIZE, 3);

		//Show the number the bar is representing
		// fill(0, 0, 0);
  //       stroke(0, 0, 0)
		// textAlign(CENTER, CENTER);
		// text(str(number), this.x + this.BAR_AREA_WIDTH / 2, this.h - 10);
	}
});

var swapIndicator = sprites.extend(sprites.Sprite, {
    init: function(obj) {
        if(obj) {this.reinit(obj);}
        sprites.Sprite.init.call(this, "Swap Indicator", 0, 0, 0, 0);
        this.visible = false;
        scene.add(this);
    },
    reinit: function(obj) {
        this.bar1 = obj.bar1;
        this.bar2 = obj.bar2;

        this.middle1Y = this.bar1.y - this.bar1.h/2;
        this.middle2Y = this.bar2.y - this.bar2.h/2;

        this.middle1X = this.bar1.x + BAR_AREA_WIDTH/2;
        this.middle2X = this.bar2.x + BAR_AREA_WIDTH/2;
        
        this.triP = (this.middle2Y - this.middle1Y)/(this.middle2X - this.middle1X) * 5 + 10
    },
    draw: function() {
        if (this.visible){
            strokeWeight(1);
            stroke(0,0,0);
            fill(0,0,0);
            line(this.middle1X, WINDOW_SIZE - 5, this.middle2X, WINDOW_SIZE - 5);
            triangle(this.middle1X, WINDOW_SIZE - 5, this.middle1X - 3, WINDOW_SIZE - 10, this.middle1X - 3, WINDOW_SIZE);
            triangle(this.middle2X, WINDOW_SIZE - 5, this.middle2X + 3, WINDOW_SIZE - 10, this.middle2X + 3, WINDOW_SIZE);
        }
    }
});

var partitionIndicator = sprites.extend(sprites.Sprite, {
    init: function(obj) {
        if (obj) {this.reinit(obj);}
        sprites.Sprite.init.call(this, "Partition Indicator", 0, 0, 0, 0);
        this.visible = false;
        scene.add(this);
    },
    reinit: function(obj) {
        this.start = obj.start
        this.end = obj.end
    },
    draw: function() {
        stroke(0,0,0);
        strokeWeight(2);
        line(this.start * BAR_AREA_WIDTH + BAR_AREA_WIDTH/2, 0, this.start * BAR_AREA_WIDTH + BAR_AREA_WIDTH/2, WINDOW_SIZE);
        line(this.end * BAR_AREA_WIDTH + BAR_AREA_WIDTH/2, 0, this.end * BAR_AREA_WIDTH + BAR_AREA_WIDTH/2, WINDOW_SIZE);
    }
});

var swapObjects = function(array, a, b) {
    var holder = array[a];
    array[a] = array[b];
    array[b] = holder;
};

var workingFrame = 0

var animateSwap = function(a, b) {
	var bar1 = bars[a];
    var bar2 = bars[b];
    
    timeline.addEvent(workingFrame, 1, function() {
        swapper.reinit({
            bar1: bar1,
            bar2: bar2
        });
        swapper.visible = true;
        bar1.switching = true;
        bar2.switching = true;
    });
    workingFrame += 8
    timeline.addEvent(workingFrame, 1, function() {
        var holder = bar1.number;
        bar1.number = bar2.number;
        bar2.number = holder;
        holder = bar1.h;
        bar1.h = bar2.h;
        bar2.h = holder;
        swapObjects(bars, a, b);
    });
    workingFrame+= 8
    timeline.addEvent(workingFrame, 1, function() {
        swapper.visible = false;
        bar1.switching = false;
        bar2.switching = false;
    });
}

//==================Given==============
var swap = function(array, a, b) {
    var holder = array[a];
    array[a] = array[b];
    array[b] = holder;
    animateSwap(a, b);
};

var compareSortValueForward = function(a, b) {
    return a < b;
};

var animatePartition = function(start, end) {
    timeline.addEvent(workingFrame, 1, function() {
        partitioner.reinit({
            start: start,
            end: end
        });
        partitioner.visible = true;
    });
}

//=================Written==============
var partition = function(array, p, r, compare) {
    animatePartition(p,r);
    var pivot = array[r];

    var i = p;
    var j = p;

    while (j < r) {
        if (compare(array[j], pivot)) {
            j++;
        }else{
            swap(array, j, i);
            j++;
            i++;
        }
    }

    swap(array, r, i);
    return i;
};

var quickSort = function(array, p, r, compare) {
    if (p >= r) {
        return;
    }
    var q = partition(array, p, r, compare);

    quickSort(array, p, q - 1, compare);
    quickSort(array, q + 1, r, compare);
};

//============Underneath Hood=========
var sort = function(array, compare) {
    var d = new Date();
    var startTime = d.getTime();
	quickSort(array, 0, array.length - 1, compare);
    d = new Date();
    var endTime = d.getTime();
    console.log("Sorted " + String(array.length) + " objects in " + String(endTime - startTime) + " milliseconds");
    timeline.addEvent(workingFrame, 50, function() {
        partitioner.visible = false;
        partitioner.reinit({
            start: -1,
            end: -1
        });
    });
}

var scene = Object.create(sprites.Scene);
scene.init(function() {
    background(240, 240, 240);
    textAlign(CENTER, CENTER);
});

var timeline = Object.create(sprites.Timeline);

for (var i = 0; i < objects.length; i++) {
    var number = objects[i];
    var bar = Object.create(barSprite)
    bar.init({
        x: i * BAR_AREA_WIDTH,
        number: number
    });
    bar.draw()
    bars.push(bar)
}

var swapper = Object.create(swapIndicator);
swapper.init();
var partitioner = Object.create(partitionIndicator);
partitioner.init();

sort(objects, compareSortValueForward)


sprites.startAnimation(scene, timeline);
timeline.play();
})();  // end "strict"`
}};  // end "with processing..."