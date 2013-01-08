
__resources__["/__builtin__/level.js"] = {meta: {mimetype: "application/javascript"}, data: function(exports, require, module, __filename, __dirname) {
var util = require("util")
  , debug = require("debug")
  , pipe = require('pipe')
  , TimeStamper = require("director").TimeStamper
  , Scene = require('scene').TreeScene
  , geo = require('geometry');


var Klass = require("base").Klass
,   Trait = require("oo").Trait;


var levelTrait = Trait.extend({
  initialize:function(param)
  {
    this.execProto("initialize");

    this.slot("_timeStamper", TimeStamper.create());
    this.slot("_sysPipe", pipe.createSwitcher());
    //this.slot("_sysPipe", pipe.createEventTrigger(this.slot("_timeStamper")));
    if (param && param.scene)
      this.slot("_scene", param.scene);
    else
      this.slot("_scene", Scene.create());

    return this;
  },
  
  onActive: function(director)
  {
    this.slot("_sourcePipe", pipe.createEventTrigger(this.slot("_timeStamper")));
    pipe.switchSource(this.slot("_sysPipe"), this.slot("_sourcePipe"));
    this.slot("_scene").exec("onActive");
  },
  
  onDeactive: function()
  {
    this.slot("_scene").exec("onDeactive");
  },
  
  update: function(t)
  {
    //this.slot("_timeStamper").exec("stepForward", dt);
    this.slot("_timeStamper").exec("adjust", t);
    this.slot("_scene").exec("update", t);
  },

  sysPipe:function()
  {
    return this.slot("_sysPipe");
  },
  
  switchPipeTriggerEvent:function(evt)
  {
    if(this.slot("_sourcePipe"))
      pipe.triggerEvent(this.slot("_sourcePipe"), evt);    
  },
  
  scene: function()
  {
    return this.slot("_scene");
  },

  setScene:function(scene)
  {
    var bRunningLevel = require("director").director().exec("getLevel") == this;

    var old = this.slot("_scene");

    if (bRunningLevel && old)
      old.exec("onDeactive", this);

    //fixme: if scene is already in some other level?
    this.slot("_scene", scene);

    if (bRunningLevel && scene)
      scene.exec("onActive", this);

    return old;
  }
});

var Level = Klass.extend([levelTrait]);

exports.Level = Level;

}};