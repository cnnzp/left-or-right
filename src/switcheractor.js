
__resources__["/switcheractor.js"] = {meta: {mimetype: "application/javascript"}, data: function(exports, require, module, __filename, __dirname) {
var Klass = require("base").Klass
,   Trait = require("oo").Trait
,   debug = require("debug")
,   Actor = require("node").Actor
,   getAllPS = require("ps").getAllPS
,   m = require("model")
,   h = require("helper")
,   geo = require("geometry");

var angle2radian = function(a)
{
  return a * Math.PI / 180;
};

var createSwitchModel = function(normalStyle, normalStrokeStyle, lineColor, radius, switcher)
{
  var switchModelDraw = function(m, painter)
  {
    var ctx = painter.exec("getContext", "2d");
    ctx.save();

    ctx.translate(radius, radius);

    ctx.fillStyle = normalStyle;
    // ctx.strokeStyle = normalStrokeStyle;

    ctx.beginPath();
    
    ctx.arc(0, 0, radius, angle2radian(150), angle2radian(128+360));
    ctx.lineTo(-radius-4, radius);
    ctx.lineTo(-0.8660254037844387 * radius, 0.5*radius);
    ctx.fill();
    // ctx.stroke();

    ctx.closePath();

    // ctx.strokeStyle = normalStyle;

    ctx.translate(-140, 53);
    ctx.font = "10pt Arial";
    ctx.fillText("Click to Switch Branches", 0, 0);
    ctx.restore();



    //
    var jointPoint = switcher.getJointPoint();
    ctx.save();
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    ctx.beginPath();
    ctx.arc(jointPoint.x, jointPoint.y, radius, 0, Math.PI*2);
    ctx.clip();
    
    switcher.curBranch.paint(painter, lineColor);
    
    if (ctx.setLineDash)
      ctx.setLineDash([]);
    switcher.m.paint(painter, lineColor);

    if (ctx.setLineDash)
    {
      ctx.setLineDash([3,3]);
      if (switcher.curBranch == switcher.b1)
        switcher.b2.paint(painter, lineColor);
      else
        switcher.b1.paint(painter, lineColor);
    }
    else
    {
      var oldCurBranch = switcher.curBranch;
      switcher.curBranch = switcher.curBranch == switcher.b1 ? switcher.b2 : switcher.b1;
      switcher.paint(painter, lineColor);
      switcher.curBranch = oldCurBranch;
      // if (switcher.curBranch == switcher.b1)
      //   switcher.b2.paint(painter, lineColor);
      // else
      //   switcher.b1.paint(painter, lineColor);
    }

    ctx.restore();
  };

  var switchModelBbox = function(m, painter)
  {
    return new geo.Rect(0, 0, 2*radius, 2*radius);
  };

  var switchModelInside = function(m, x, y, painter)
  {
    var d2 = Math.pow(x - radius, 2) + Math.pow(y - radius, 2);
    return d2 <= radius * radius;
  };

  return m.ProcedureModel.create({draw:switchModelDraw, bbox:switchModelBbox, inside:switchModelInside});
};

var SwitcherActor = Actor.extend(
  undefined,
  {
    initialize:function(param)
    {
      this.execProto("initialize", param);

      // var m1 = m.ImageModel.create({image:h.loadImage("images/normal.png")});
      // var m2 = m.ImageModel.create({image:h.loadImage("images/focus.png")});
      var m1 = m.moveRelative(-0.5, -0.5, createSwitchModel("rgb(210, 210, 210)", "rgb(160, 160, 160)", "black", 32, param.switcher));
      var m2 = m.moveRelative(-0.5, -0.5, createSwitchModel("black", "black", "white", 32, param.switcher));

      this.slot("_switcher", param.switcher);
      
      this.exec("addEventListener", 
                "mouseClicked", 
                (function()
                 {
                   this.slot("_switcher").doSwitch();

                 }).bind(this));
      
      this.exec("addEventListener",
                "mouseOut",
                (function()
                {
                  //change cursor to hand
                  var painter = require("director").director().exec("defaultPainter");
                  var canvas = painter.exec("sketchpad");
                  
                  this.exec("setModel", m1);

                  canvas.style.cursor = "default";
                }).bind(this));

      this.exec("addEventListener",
                "mouseOver",
                (function()
                 {
                   //change cursor to hand

                   this.exec("setModel", m2);

                   var painter = require("director").director().exec("defaultPainter");
                   var canvas = painter.exec("sketchpad");

                   canvas.style.cursor = "pointer";
                 }).bind(this));

      this.exec("setModel", m1);
    },
  });

var createAllSwitcherActors = function(ps, level)
{
  var pses = getAllPS(ps);
  
  // var switcherModel = m.ConvexModel.create({vertexes: [{x:0,y:0}, {x:70, y:0}, {x:70, y:70}, {x:0, y:70}],
  //                                           stroke:"rgb(0, 50, 0)"});
  // switcherModel = m.moveRelative(-0.5, -0.5, switcherModel);

  return Object.keys(pses)
    .map(function(k)
         {
           return pses[k];
         })
    .filter(function(ps)
            {
              return ps.type == "switcher";
            })
    .map(function(switcher)
         {
           var a = SwitcherActor.create({level:level, switcher:switcher});
           var jointPoint = switcher.getJointPoint();
           a.exec("translate", jointPoint.x, jointPoint.y, 1);

           return a;
         });
};

exports.SwitcherActor = SwitcherActor;
exports.createAllSwitcherActors = createAllSwitcherActors;


}};