
__resources__["/__builtin__/eventdecider.js"] = {meta: {mimetype: "application/javascript"}, data: function(exports, require, module, __filename, __dirname) {
var geo = require("geometry")
,   util = require("util")
,   debug = require("debug")
,   pipe = require("pipe")
,   Klass = require("base").Klass
,   Trait = require("oo").Trait;

//resolve the events which nodes do not know how to dispatch
var deciderTrait = Trait.extend({
  initialize : function(param)
  {
    this.execProto("initialize");

    //hashmap<id, {event, waiters}>
    //waiters--> [{node,pipe}...]
    this.slot("_waiters", {});
  },
  
  decide:function(node, event, destPipe)
  {
    //FIXME: how to distinguish events
    var evtId = event.identifier;
    if (!this.slot("_waiters")[evtId])
      this.slot("_waiters")[evtId] = {event:event, waiters:[]};

    this.slot("_waiters")[evtId].waiters.push({node:node, pipe:destPipe});
  },
  
  decideEvent:function(painter, view)
  {
    var evtId, waiter, waiters = this.slot("_waiters");

    for (evtId in waiters)
    {
      if (!waiters.hasOwnProperty(evtId))
        continue;

      waiter = waiters[evtId];

      addPstnInGameWorld(view, waiter.event);
      this.exec("doDecideEvent", painter, view, waiter.event, waiter.waiters);

      delete waiters[evtId];
    }
  },
  
  doDecideEvent:function(painter, view, evt, dests)
  {
    debug.assert('cannot be here:decideEvent is base');
  },

  //waiters:[{node:node, pipe:destPipe} ...] --> {waiter:waiter, model:model, modelpath:modelpath}
  hitTestNodes:function(painter, view, pos, waiters)
  {
    var self = this;

    var controlmodels = []; //{model:model, effect:{matrix:mat, ...}}
    waiters.forEach(function(waiter)
                    {
                      var cms = [];
                      waiter.node.exec("emmitControlModels", cms);
                      cms.forEach(function(cm)
                                  {
                                    cm.ownerWaiter = waiter;
                                  });
                      
                      controlmodels = controlmodels.concat(cms);
                    });

    var hitOne, modelPath;

    controlmodels.sort(function(c1, c2)
                       {
                         //fixme:view should suppor compare model
                         return view.exec("compareModel", painter, c1.model, c1.effect.matrix, c2.model, c2.effect.matrix);
                       })
      .some(function(controlModel)
            {
              modelPath = self.exec("hitTest", painter, view, pos, controlModel);
              if (modelPath != false)
              {
                hitOne = controlModel;
                return true;
              }

              return false;
            });

    if (hitOne)
    {
      debug.assert(hitOne.model && hitOne.ownerWaiter, "logical error");
      return {waiter:hitOne.ownerWaiter, 
              model:hitOne.model, 
              modelPath:typeof(modelPath) == "string" ? modelPath : undefined};
    }
  },

  //control:{model:model, effect:{matrix:matrix, ...}}
  hitTest:function(painter, view, viewPstn, controlModel)
  {
    debug.assert(controlModel.model && controlModel.effect.matrix, "parameter error");

    var pstnRel2Model = view.exec("getPstnRelativeToModel", viewPstn, controlModel.model, controlModel.effect);

    return painter.exec("inside", controlModel.model, pstnRel2Model);
  }
});

var addPstnInGameWorld = function(view, evt)
{
  var mat = geo.matrixInvert(view.exec("getGameToViewMatrix"));
  var gamePstn = geo.pointApplyMatrix({x:evt.mouseX, y:evt.mouseY}, mat);

  evt.gameX = gamePstn.x;
  evt.gameY = gamePstn.y;

  return evt;
};

var Decider = Klass.extend([deciderTrait]);

var hoverEventDeciderTrait = Trait.extend({
  initialize : function(param)
  {
    this.execProto("initialize");
  },
  
  doDecideEvent:function(painter, view, evt, waiters)
  {
    debug.assert(evt.type == 'mouseMoved', 'hovereventDecider receive unknown evtType:'+evt.type);
    
    var hitInfo = this.exec("hitTestNodes", painter, view, {x:evt.mouseX, y:evt.mouseY}, waiters);
    var targetNode = hitInfo ? hitInfo.waiter.node : undefined;

    //check mouseout
    if (this.slot("_activeNode") && 
        ((targetNode !== this.slot("_activeNode")) || hitInfo.modelPath != this.slot("_activeModelPath") || hitInfo.model != this.slot("_activeModel")))
    {
      var newEvt = util.copy(evt);
      newEvt.type = 'mouseOut';
      newEvt.model = this.slot("_activeModel");
      newEvt.modelPath = this.slot("_activeModelPath");

      pipe.triggerEvent(this.slot("_activePipe"), newEvt);

      this.slot("_activeNode", undefined);
      this.slot("_activeModel", undefined);
      this.slot("_activeModelPath", undefined);
      this.slot("_activePipe", undefined);
    }

    //check mouseover
    if (targetNode && targetNode !== this.slot("_activeNode"))
    {
      this.slot("_activeNode", hitInfo.waiter.node);
      this.slot("_activeModel", hitInfo.model);
      this.slot("_activeModelPath", hitInfo.modelPath);
      this.slot("_activePipe", hitInfo.waiter.pipe);

      var newEvt = util.copy(evt);
      newEvt.type = 'mouseOver';
      newEvt.modelPath = hitInfo.modelPath;

      pipe.triggerEvent(this.slot("_activePipe"), newEvt);
    }
  }
});

var HoverEventDecider = Decider.extend([hoverEventDeciderTrait]);

var shakeSpan = 10;

var mouseButtonEventDeciderTrait = Trait.extend({
  initialize : function(param)
  {
    this.execProto("initialize");
    
    this.slot("_hasPendDragEvt", false);
    this.slot("_dragTriggered", false);
  },
  
  doDecideEvent:function(painter, view, evt, waiters)
  {
    debug.assert(evt.type == 'mouseClicked' || evt.type == 'mousePressed' ||
                 evt.type == 'mouseReleased' || evt.type == 'mouseDragged',
                 'I cannot decide event type:'+evt.type);

    switch (evt.type)
    {
    //fixme: event should has model and modelpath info
    case 'mousePressed':
      if (this.slot("_pressedInfo"))
      {
        var evt1 = util.copy(this.slot("_pressedEvent"));

        if (this.slot("_hasPendDragEvt"))
        {
          evt1.type = 'mouseClicked';

          pipe.triggerEvent(this.slot("_pressedInfo").waiter.pipe, evt1);

          debug.assert(!this.slot("_dragTriggered"), 'mouseButtonDecider:logical error');
          this.slot("_hasPendDragEvt", false);
          this.slot("_dragTriggered", false);
        }

        evt1.type = 'mouseReleased';
        pipe.triggerEvent(this.slot("_pressedInfo").waiter.pipe, evt1);
        this.slot("_pressedInfo", undefined);
        this.slot("_pressedEvent", undefined);
      }

      var pressedInfo = this.exec("hitTestNodes", painter, view, {x:evt.mouseX, y:evt.mouseY}, waiters);

      if (pressedInfo)
      {
        this.slot("_pressedInfo", pressedInfo);
        this.slot("_pressedEvent", util.copy(evt));
        this.slot("_pressedEvent").modelPath = pressedInfo.modelPath;

        pipe.triggerEvent(this.slot("_pressedInfo").waiter.pipe, this.slot("_pressedEvent"));
      }
      break;

    case 'mouseReleased':
      if (this.slot("_pressedInfo"))
      {
        debug.assert(this.slot("_pressedEvent"), 'logical error!');
        
        if (this.slot("_hasPendDragEvt"))
        {
          var clickevt = util.copy(this.slot("_pressedEvent"));
          clickevt.type = 'mouseClicked';

          pipe.triggerEvent(this.slot("_pressedInfo").waiter.pipe, clickevt);
          this.slot("_hasPendDragEvt", false);
        }

        var releaseEvt = util.copy(evt);
        releaseEvt.modelPath = this.slot("_pressedInfo").modelPath;

        pipe.triggerEvent(this.slot("_pressedInfo").waiter.pipe, releaseEvt);

        this.slot("_pressedInfo", undefined);
        this.slot("_pressedEvent", undefined);
        this.slot("_dragTriggered", false);
      }
      break;

    case 'mouseClicked':
      if (this.slot("_pressedInfo"))
      {
        var clickedEvt = util.copy(evt);
        clickedEvt.modelPath = this.slot("_pressedEvent").modelPath;

        pipe.triggerEvent(this.slot("_pressedInfo").waiter.pipe, clickedEvt);
      }
      break;

    case 'mouseDragged':
      if (this.slot("_pressedInfo"))
      {
        var dragEvt = util.copy(evt);
        dragEvt.modelPath = this.slot("_pressedInfo").modelPath;

        if (this.slot("_dragTriggered"))
        {
          pipe.triggerEvent(this.slot("_pressedInfo").waiter.pipe, dragEvt);
          break;
        }

        this.slot("_hasPendDragEvt", true);

        if (!this.exec("testShake", this.slot("_pressedEvent"), evt))
        {
          this.slot("_hasPendDragEvt", false);
          this.slot("_dragTriggered", true);
          pipe.triggerEvent(this.slot("_pressedInfo").waiter.pipe, dragEvt);
        }
      }

      break;

    default:
      debug.assert(false, 'cannot be here!');
      break;
    }
  },

  testShake:function(evtPressed, evtDragged)
  {
    var distX = evtDragged.mouseX - evtPressed.mouseX;
    var distY = evtDragged.mouseY - evtPressed.mouseY;
    return (distX * distX + distY * distY) < shakeSpan * shakeSpan;
  }
});

var MouseButtonEventDecider = Decider.extend([mouseButtonEventDeciderTrait]);

var keyEventDeciderTrait = Trait.extend({
  initialize : function(param)
  {
    this.execProto("initialize");
  },
  
  doDecideEvent:function(painter, view, evt, waiters)
  {
    debug.assert(evt.type == 'keyPressed' || evt.type == 'keyReleased', 
                 'I cannot decide event type:'+evt.type);

    var i, waiter;

    for (i=0; i<waiters.length; i++)
    {
      waiter = waiters[i];

      pipe.triggerEvent(waiter.pipe, evt);
    }
  }
});

var KeyEventDecider = Decider.extend([keyEventDeciderTrait]);

var commonEventDeciderTrait = Trait.extend({
  initialize : function(param)
  {
    this.execProto("initialize");
  },
  
  doDecideEvent:function(painter, view, evt, waiters)
  {
    var i, waiter;

    for (i=0; i<waiters.length; i++)
    {
      waiter = waiters[i];

      pipe.triggerEvent(waiter.pipe, evt);
    }
  }
});

//var CommonEventDecider = Decider.extend([commonEventDeciderTrait]);

var CommonEventDecider = Decider.extend(
  [
    hoverEventDeciderTrait.rename({
      initialize:"hoverEvtDeciderInit",
      doDecideEvent:"doDecideHoverEvent"
    }),

    mouseButtonEventDeciderTrait.rename({
      initialize:"mouseEvtDeciderInit",
      doDecideEvent:"doDecideMouseButtonEvent"
    }),

    keyEventDeciderTrait.rename({
      initialize:"keyEvtDeciderInit",
      doDecideEvent:"doDecideKeyEvent"
    }),

    commonEventDeciderTrait.rename({
      initialize:"commonEvtDeciderInit",
      doDecideEvent:"doDecideCommonEvent"
    })],

  {
    initialize:function(param)
    {
      this.exec("hoverEvtDeciderInit");
      this.exec("mouseEvtDeciderInit");
      this.exec("keyEvtDeciderInit");
      this.exec("commonEvtDeciderInit");
    },

    doDecideEvent:function(painter, view, evt, waiters)
    {
      switch(evt.type)
      {
      case "mouseMoved":
        return this.exec("doDecideHoverEvent", painter, view, evt ,waiters);
      case "mouseClicked":
      case "mousePressed":
      case "mouseReleased":
      case "mouseDragged":
        return this.exec("doDecideMouseButtonEvent", painter, view, evt, waiters);
      case "keyPressed":
      case "keyReleased":
        return this.exec("doDecideKeyEvent", painter, view, evt, waiters);
      case "mouseOver":
      case "mouseOut":
        return;
      default:
        return this.exec("doDecideCommonEvent", painter, view, evt, waiters);
      }
    }
  }
);

exports.Decider = Decider;
exports.CommonEventDecider = CommonEventDecider;
exports.HoverEventDecider = HoverEventDecider;
exports.MouseButtonEventDecider = MouseButtonEventDecider;
exports.KeyEventDecider = KeyEventDecider;

}};