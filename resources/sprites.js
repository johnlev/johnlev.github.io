
var loadSpriteLibrary = function(processingInstance) {
    with (processingInstance) {



var sprites = function() {
"use strict";

    // A minimalist sprite library for KA visualizations.  
    //   Devin Balkcom, June 2014.


    // Uses prototypical object pattern like that described at 
    // http://davidwalsh.name/javascript-objects-deconstruction

    var extend = function(proto, properties) {
        var obj = Object.create(proto);
        for (var p in properties) {
            if ( properties.hasOwnProperty(p) ) {
                obj[p] = properties[p];
            }
        }
        return obj;
    };


    // global constants used to indicate time periods for timelines
    var FOREVER = -1;
    var NONE = -2;

    // optionally pass in a function to draw background, etc in drawInit
    var Scene = {
        init: function(drawInit) {
            this.sprites = [];
            this.drawInit = drawInit;
            this.draggingSprite = NONE;
            this.lastClickedSprite = null;
            this.firstDrawnSprites = []
            this.lastSprite = null

            this.mousePressed = null;            

        },
        draw: function() {
            if (this.drawInit) { 
                this.drawInit(); 
            }
            for (var i = 0; i < this.firstDrawnSprites; i++) {
                var sprite = this.firstDrawnSprites[i];
                sprite.draw();
            }
            for (var i = 0; i < this.sprites.length; i++) {
                var sprite = this.sprites[i];
                if (!(sprite in this.firstDrawnSprites || sprite == this.lastSprite)) { sprite.draw(); }

                // update mouseOver property for sprites and 
                //  selected sprite for the scene
                sprite.mouseOver = false;
                if (sprite.containsPoint(mouseX, mouseY)) {
                    sprite.mouseOver = true;
                }
            }

            if (this.lastSprite) {
                this.lastSprite.draw();
            }
            this.lastSprite = null;

            if (this.draggingSprite !== NONE) {
                this.sprites[this.draggingSprite].draw();
            }
        },

        add:  function(sprite) {
            this.sprites.push(sprite);
        },

        makeDrawnFirst: function(sprite) {
            this.firstDrawnSprites.unshift(sprite);
        },

        removeAll: function(spriteName) {
            for (var i = this.sprites.length - 1; i >= 0 ; i--) {
                if (this.sprites[i].name === spriteName) {
                    this.sprites.splice(i, 1);
                }
            }
        },
        poll: function() {
            // For the user to do something in every frame, like count frames
        }
    };


    // definition of a grid that can be used to convert between coordinates of
    //  larger cells and pixel coordinates.  Useful for moving sprites between
    //  locations on a on-screen grid. 

    var Grid = {
        // uses object-creation pattern from 
        //  http://davidwalsh.name/javascript-objects-deconstruction

        init: function(leftX, topY, width, height) {
            this.leftX = leftX;
            this.topY = topY;
            this.width = width;
            this.height = height;
        },
        pixelX: function(gridX) {
            return this.leftX + gridX * (this.width);
        },
        pixelY: function(gridY) {
            return this.topY+ gridY * (this.height);
        }
    };


    // Definition of sprite object
    /////////////////////////////

    // name is a string describing the sprite name.  Used to find sprites in the scene
    //  (for example, to remove them).

    // optionally pass in parameters for initial location and height.
    //  However, getX(), getH(), getW(), and getH() are the proper way to get location, width
    //  and height of a sprite.  Typically, these functions are bound to a model
    //  in a model-view design.

    var Sprite = {

        init:  function(name, x, y, w, h) {

            this.name = name;

            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;

            this.mouseOver = false;
            this.mousePressed = false;

            this.draggable = false;

            this.visible = true;
            this.selected = false;
            this.release = undefined;
        },

        // set up initial functions to return location of the sprite.  For a sprite
        //  that is not bound to a model, these are fine default functions to return location
        getX: function() {
            return this.x;
        },
        getY: function() {
            return this.y;
        },

        getW: function() {
            return this.w;
        },

        getH: function() {
            return this.h;
        },

        show: function() {
            this.visible = true;
        },

        hide: function() {
            this.visible = false;
        },
        select: function() {
            this.selected = true;
        },
        unselect:function() {
            this.selected = false; 
        },

        draw: function() {},

        translate: function(tx, ty) {
            this.x += tx;
            this.y += ty;
        },

        // animate the motion of a sprite from one location to another on a grid.        
        gridMove: function(timeline, workingFrame, grid, fromGridX, fromGridY, toGridX, toGridY) {


            var dx = ( grid.pixelX(toGridX) - grid.pixelX(fromGridX) );
            var dy = ( grid.pixelY(toGridY) - grid.pixelY(fromGridY) );

            // normalize speed
            var length = sqrt(dx * dx + dy * dy);

            var duration = length;

            dx /= length;
            dy /= length;

            timeline.addEvent(workingFrame, duration, this.translate.bind(this, dx, dy) );

            return duration;

        },


        containsPoint: function(x, y) {
            return x >= this.getX() && y >= this.getY()  &&
                x < (this.getX() + this.getW()) && y < (this.getY() + this.getH());
        }
    };


    var TextSprite = Object.create(Sprite);

    TextSprite.init = function(string, x, y, alignment, label) {
        sprites.Sprite.init.call(this, label, x, y, 0, 0);
        this.string = string;
        this.alignment = alignment;
    };

    TextSprite.draw = function() {
        textAlign(this.alignment);
        fill(0, 0, 0);
        text(this.string, this.x, this.y);
        textAlign(LEFT);

    };

    TextSprite.changeText = function(timeline, workingFrame, string) {
        var textSprite = this;
        timeline.addEvent(workingFrame, 1, function() {
            textSprite.string = string;
         } );
    };


    var ImageSprite = Object.create(Sprite);

    ImageSprite.init = function(string, x, y, w, h, image) {
        sprites.Sprite.init.call(this, string, x, y, w, h);
        this.image = image;
    };

    ImageSprite.draw = function() {
        image(this.image, this.x, this.y, this.w, this.h);
    };


    var Timeline = {

        // a simple hashtable with keys that are times (a frame number) 
        //  and values that are functions to run at those times:

        events: [],
        currentFrame: 0, // an int keeping track of current frame to draw
        speed: 1,
        time: 0,  // a float value keeping track of current time on the timeline
        paused: true,

        lastFrame: 0,

        // a list of times that can be advanced to with "step"
        bookmarks: [],
        nextPause: NONE,

        init: function() {
        },

        setSpeed: function(speed) {
            this.speed = speed;
        },

        // add an event function to the list of events.  Optional parameter
        //   fnAtEnd gives a second function to execute after repeats are 
        //   completed 
        addEvent: function(start, repeats, fn, fnAtEnd) {
            var eventObject = {start: start, repeats: repeats, fn: fn};
            this.events.push(eventObject);

            if(fnAtEnd) {
                this.events.push({start: start + repeats - 1, repeats: 1, fn: fnAtEnd});
            }
            this.lastFrame = start + repeats - 1;
        },

        bookmark: function(t) {
            this.bookmarks.push(t);
        },

        update: function() {
            // catch the drawing up to the time by incrementing currentFrame until it
            //  reaches the floor of the time value.
            while(this.currentFrame < floor(this.time) ) {
                for (var i = 0; i < this.events.length; i++) {
                    var event = this.events[i];
                    if(this.currentFrame >= event.start) {
                        if(event.repeats === FOREVER ||
                            this.currentFrame < (event.start + event.repeats)) {
                                event.fn();
                        }
                    }
                }
            
                this.currentFrame++;
            }

            if (this.nextPause !== NONE && this.time >= this.nextPause) {
                this.pause();
            }

            if (!this.paused) {
                this.time += this.speed;
            }

        },

        step: function() {
            // find the least bookmark greater than the current time, and 
            //  enable playing until that time is reached
            for (var i = 0; i < this.bookmarks.length; i++ ) {
                if (this.bookmarks[i] > this.time) {
                    //this.time = this.bookmarks[i];
                    this.nextPause = this.bookmarks[i];
                    this.play();
                    break;
                }
            }
        },

        play: function() {
            this.paused = false;
        },

        pause: function() {
            this.paused = true;
        }
        
    };

    var startAnimation = function(scene, timeline) {

        draw = function() {
            timeline.update();
            scene.draw();
        };

        mousePressed = function() {

            if(scene.mousePressed) {
                scene.mousePressed();
            }

            for (var i = 0; i < scene.sprites.length; i++) {
                var sprite = scene.sprites[i];
                if(sprite.mouseOver) {
                    sprite.mousePressed = true;
                    scene.lastClickedSprite = sprite;

                    if (sprite.onAction) {
                        sprite.onAction();
                    }

                    if(sprite.draggable) {
                        scene.draggingSprite = i;
                        sprite.lastDragX = mouseX;
                        sprite.lastDragY = mouseY;
                    }
                }
            }

        };

        mouseReleased = function() {
            
            if ((scene.draggingSprite !== NONE) &&
                (scene.sprites[scene.draggingSprite].release !== undefined)) {
                scene.sprites[scene.draggingSprite].release();
            }
            scene.draggingSprite = NONE;

            // clear all mouseDown variables for sprites
            for (var i = 0; i < scene.sprites.length; i++) {
                var sprite = scene.sprites[i];
                sprite.mousePressed = false;
            }
            
        };

        mouseDragged = function() {
            if(scene.draggingSprite !== NONE) {
                var sprite = scene.sprites[scene.draggingSprite];

                if (sprite.draggable) {
                    sprite.translate(mouseX - sprite.lastDragX,
                            mouseY - sprite.lastDragY);
                    sprite.lastDragX = mouseX;
                    sprite.lastDragY = mouseY;
                }
            }
        };

        scene.draw();
    };

    return {extend: extend,
            Scene: Scene,
            Grid: Grid,
            Sprite: Sprite,
            TextSprite: TextSprite,
            ImageSprite: ImageSprite,
            Timeline: Timeline,
            startAnimation: startAnimation,
            FOREVER: FOREVER,
            NONE: NONE
        };
}();


    } // end "with processingInstance"

    return sprites;
};