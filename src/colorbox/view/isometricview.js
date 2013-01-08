
__resources__["/__builtin__/view/isometricview.js"] = {meta: {mimetype: "application/javascript"}, data: function(exports, require, module, __filename, __dirname) {
var debug = require("debug");
var util = require("util");
var geo = require("geometry");
var Klass = require("base").Klass;
var transformableTrait = require("transformable").transformableTrait;

//var game2ViewMatrix = new geo.Matrix(0.8660254037844387, 0.5, -0.8660254037844387, 0.5, 0, 0);
var game2ViewMatrix = new geo.Matrix(0.8944271909999159, 0.4472135954999579, -0.8944271909999159, 0.4472135954999579, 0, 0);
var view2GameMatrix = geo.matrixInvert(game2ViewMatrix);

//helper utilities
var findsprite = function(scene, op)
{
  var rets = [];
  
  scene.exec("filt", rets, op);
  
  if (rets.length > 0)
    return rets[0];
  else
    return undefined;
};

var findspritelist = function(scene, op)
{
  var rets = [];
  
  scene.exec("filt", rets, op);
  
  return rets;
};

var getBuildings = function(scene)
{
  return findspritelist(scene, function(n)
                        {
                          return true == n.tryExec("isUnit");
                        });
};

var getSprites = function(scene)
{
  return findspritelist(scene, function(n)
                        {
                          return true != n.tryExec("isUnit") &&
                            (true != n.tryExec("isMapActor"));
                        });
};

var getMapSprite = function(scene)
{
  return findsprite(scene,
                    function(n)
                    {
                      return n.tryExec("isMapActor");
                    });
};

var getDiBbox = function(di, painter)
{
  return geo.rectApplyMatrix(painter.exec("bbox", di.model), di.effect.matrix);
};

var adjustDisplaylist = function(displaylist)
{
  displaylist.forEach(function(d)
                      {
                        var effect = d.effect;

                        var newMatrix = geo.matrixMult(game2ViewMatrix, effect.matrix);

                        if (typeof(effect.z) == "number")
                          geo.matrixTranslateBy(newMatrix, 0, -effect.z);

                        if (effect.vertical == true && typeof(effect.z) == "number")
                        {
                          newMatrix.a = 1;
                          newMatrix.b = 0;
                          newMatrix.c = 0;
                          newMatrix.d = 1;
                        }
                        effect.matrix = newMatrix;
                      });

  return displaylist;
};

/*
  //因为斜视角下，垂直的图片实际在斜视角下，不是一个rect，所以这里统一使用四个点来表示。
  //four points
  1 2
  4 3
*/
/*
var getDiBBoxToMap = function(painter, mapNode, di)
{
  var bbox = getDiBbox(di, painter);

  var mapmat = mapNode.exec("matrix");
  var mapIvtMatrix = geo.matrixInvert(mapmat);
  
  var bbox2map = geo.rectApplyMatrix(bbox, mapIvtMatrix);

  if (di.effect.vertical == true)
  {
    var p1 = geo.pointApplyMatrix(bbox2map.origin, game2ViewMatrix);
    var p2 = {x:p1.x + bbox2map.size.width, y:p1.y};
    var p3 = {x:p2.x, y:p1.y + bbox2map.size.height};
    var p4 = {x:p1.x, y:p3.y};

    return [p1,p2,p3,p4].map(function(p)
                             {
                               return geo.pointApplyMatrix(p, view2GameMatrix);
                             });
  }
  else
  {
    var p1 = bbox2map.origin;
    var p2 = {x:p1.x + bbox2map.size.width, y:p1.y};
    var p3 = {x:p2.x , y:p1.y + bbox2map.size.height};
    var p4 = {x:p1.x, y:p3.y};

    return [p1, p2, p3, p4];
  }
};
*/

var getDiBBoxToMap = function(painter, mapNode, di)
{
  var bbox = painter.exec("bbox", di.model);

  var mapmat = mapNode.exec("matrix");
  var mapIvtMatrix = geo.matrixInvert(mapmat);
  
  var bbox2map = geo.rectApplyMatrix(bbox, mapIvtMatrix);

  if (di.effect.vertical == true)
  {
    var p1 = bbox.origin;
    var p2 = {x:p1.x + bbox.size.width, y:p1.y};
    var p3 = {x:p2.x, y:p1.y + bbox.size.height};
    var p4 = {x:p1.x, y:p3.y};

    return [p1,p2,p3,p4].map(function(p)
                             {
                               return geo.pointApplyMatrix(p, view2GameMatrix);
                             })
      .map(function(p)
           {
             return geo.pointApplyMatrix(p, di.effect.matrix);
           })
      .map(function(p)
           {
             return geo.pointApplyMatrix(p, mapIvtMatrix);
           });
  }
  else
  {
    var p1 = bbox.origin;
    var p2 = {x:p1.x + bbox2map.size.width, y:p1.y};
    var p3 = {x:p2.x , y:p1.y + bbox2map.size.height};
    var p4 = {x:p1.x, y:p3.y};

    return [p1, p2, p3, p4]      
      .map(function(p)
           {
             return geo.pointApplyMatrix(p, di.effect.matrix);
           })
      .map(function(p)
           {
             return geo.pointApplyMatrix(p, mapIvtMatrix);
           });
  }
};

var isDiNearThan = function(di1, di2, painter)
{
  var b1 = getDiBbox(di1, painter)
  ,   b2 = getDiBbox(di2, painter);

  var pstn1 = {x:b1.origin.x + b1.size.width/2, y:b1.origin.y + b1.size.height}
  ,   pstn2 = {x:b2.origin.x + b2.size.width/2, y:b2.origin.y + b2.size.height};

  //var pstn1 = {x:(b1[2].x + b1[3].x)/2, y:(b1[2].y + b1[3].y)/2}
  //,   pstn2 = {x:(b2[2].x + b2[3].x)/2, y:(b2[2].y + b2[3].y)/2};

  return Math.pow(pstn1.x, 2) + Math.pow(pstn1.y, 2) - Math.pow(pstn2.x, 2) - Math.pow(pstn2.y, 2);
};

//将displayitem插入到某个building中
var sortDiInBuildings = function(painter, mapNode, di, farestDiContainer)
{
  var bbox = getDiBBoxToMap(painter, mapNode, di);

  var standPstn = {
    // x : bbox.left + bbox.width/2,
    x:(bbox[2].x + bbox[3].x)/2,//bbox.origin.x + bbox.size.width/2,
    y:(bbox[2].y + bbox[3].y)/2//bbox.origin.y + bbox.size.height
    // y : bbox.top + bbox.height
  };
  
  var intersectUs = mapNode.exec("getEffectUnitsByRegion", bbox);
  
  var nearestU;
  intersectUs.filter(function(u)
                     {
                       return mapNode.exec("isPointNearUnit", standPstn.x, standPstn.y, u) <= 0;
                       //return !(mapNode.exec("isPointNearUnit", bbox[3].x, bbox[3].y, u) <= 0 ||
                       //mapNode.exec("isPointNearUnit", bbox[2].x, bbox[2].y, u) <= 0);
                     }).
    forEach(function(u)
            {
              mapNode.exec("getUnitUserData", u)["sheltereddl"].push(di);
              if (!nearestU || mapNode.exec("isUnit1NearerUnit2", u, nearestU) <= 0)
                nearestU = u;
            });
  
  if (nearestU)
    mapNode.exec("getUnitUserData", nearestU)["dl"].push(di);
  else
//    mapNode.exec("getUnitUserData", ms[ms.length-1])["sprites"].push(sprite);
    farestDiContainer.push(di);
};

var sortRenderObjects = function(painter, mapNode, sprites)
{
  var dl = [];
  sprites.forEach(function(s)
                  {
                    return s.exec("emmitModels", dl);
                  });

  if (!mapNode)
  {
    return {dl:dl.sort(function(di1, di2){return isDiNearThan(di1, di2, painter)})};
  }

  var farestDiContainer = [];

  var us = mapNode.exec("getUnits");
  us.forEach(function(u)
             {
               var data = mapNode.exec("getUnitUserData", u);
               data["dl"] = [];
               data["sheltereddl"] = [];
               
               mapNode.exec("setUnitUserData", u, data);
             });

  dl.forEach(function(di)
             {
               sortDiInBuildings(painter, mapNode, di, farestDiContainer);
             });

  us.forEach(function(unit)
             {
               mapNode.exec("getUnitUserData", unit)["dl"].sort(function(di1, di2){return isDiNearThan(di1, di2, painter)});
             });

  farestDiContainer.sort(function(di1, di2){return isDiNearThan(di1, di2, painter)});

  return {us:us, dl:farestDiContainer};
};

var Camera = Klass.extend([transformableTrait]);

var View = Klass.extend(
  [],
  {
    initialize:function(param)
    {
      this.execProto("initialize", param);

      var camera = Camera.create(require("director").timeStamp);
      this.slot("camera", camera);

      if (param && param.converter)
        this.slot("_converter", param.converter);
      else
        this.slot("_converter", function(di){return di;});//display item
    },

    translate:function(x, y)
    {
      var pstn = geo.pointApplyMatrix({x:x, y:y}, game2ViewMatrix);
      return this.slot("camera").exec("translate", pstn.x, pstn.y);
    },

    applyTranslate:function(x, y)
    {
      var pstn = geo.pointApplyMatrix({x:x, y:y}, game2ViewMatrix);
      return this.slot("camera").exec("applyTranslate", pstn.x, pstn.y);
    },

    getPstnRelativeToModel:function(viewPstn, model, effect)
    {
      var mat = geo.matrixInvert(geo.matrixMult(this.exec("getGameToViewMatrix"), effect.matrix));

      var pstn = geo.pointApplyMatrix(viewPstn, mat);
      
      if (effect.vertical == true)
      {
        pstn = geo.pointApplyMatrix(pstn, game2ViewMatrix);
      }

      return pstn;
    },

    compareModel:function(painter, model1, matrix1, model2, matrix2)
    {
      return isDiNearThan({model:model1, effect:{matrix:matrix1}}, {model:model2, effect:{matrix:matrix2}}, painter);
    },

    /*
    scale:function(x, y)
    {
      return this.slot("camera").exec("scale", x, y);
    },

    applyScale:function(x, y)
    {
      return this.slot("camera").exec("applyScale", x, y);
    },

    scaleX:function(s)
    {
      return this.slot("camera").exec("scaleX", s);
    },

    applyScaleX:function(s)
    {
      return this.slot("camera").exec("applyScaleX", s);
    },

    scaleY:function(s)
    {
      return this.slot("camera").exec("scaleY", s);
    },

    applyScaleY:function(s)
    {
      return this.slot("camera").exec("applyScaleY", s);
    },
    */
    view:function(painter, scene)
    {
      var ctx = painter.exec("getContext", "2d");
      ctx.save();
      
      var mat = this.slot("camera").exec("matrix");

      ctx.setTransform(mat.a, mat.b, mat.c, mat.d, Math.round(mat.tx), Math.round(mat.ty));
      
      this.exec("_doView", painter, scene);
      
      ctx.restore();
    },

    _doView:function(painter, scene)
    {
      var view = this;

      var mapNode = getMapSprite(scene);

      //{us:units, dl:dl}  dl用来在地图上所有物件绘制完成之后才需要绘制的displaylist
      var totalRenderers = sortRenderObjects(painter, mapNode, getSprites(scene));
      
      if (mapNode)
      {
        var displaylist = [];
        mapNode.exec("emmitModels", displaylist);
        painter.exec("drawModels", adjustDisplaylist(displaylist));
      }

      if (totalRenderers.us)
        totalRenderers.us.forEach(function(unit)
                                  {
                                    var unitUserData = mapNode.exec("getUnitUserData", unit);
                                    var dl = adjustDisplaylist(unitUserData["dl"]);

                                    var di = view.slot("_converter")({model:mapNode.exec("getUnitModel", unit), effect:{matrix:mapNode.exec("matrix"), dl:unitUserData["sheltereddl"]}});

                                    painter.exec("drawModels", dl);
                                    painter.exec("drawModel", di.model, di.effect);
                                  });

      if (totalRenderers.dl)
        painter.exec("drawModels", adjustDisplaylist(totalRenderers.dl));
    },
    
    getGameToViewMatrix:function()
    {
      var mat = this.slot("camera").exec("matrix");
      return geo.matrixMult(mat, game2ViewMatrix);
    }
  });

exports.IsometricView = View;

}};