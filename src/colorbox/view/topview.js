
__resources__["/__builtin__/view/topview.js"] = {meta: {mimetype: "application/javascript"}, data: function(exports, require, module, __filename, __dirname) {
var debug = require("debug");
var util = require("util");
var geo = require("geometry");
var Klass = require("base").Klass;
var transformableTrait = require("transformable").transformableTrait;

var displaylist = [];
var actorlist = [];

//fixme:sceme 当做参数
var view = function(painter, scene)
{
  displaylist.length = 0;
  actorlist.length = 0;

  scene.exec("filt", actorlist, function(a){return a != undefined;});   
  
  actorlist.forEach(function(a)
                    {
                      return a.exec("emmitModels", displaylist);
                    });

  displaylist.sort(function(i1, i2)
                   {
                     return i1.effect.matrix.tz - i2.effect.matrix.tz;
                   });

  painter.exec("drawModels", displaylist);
};

var cmpZ =  function (n1, n2, painter)
{
  var m1 = n1.exec("matrix");
  var m2 = n2.exec("matrix");
  var ret = m1.tz - m2.tz;
  return ret;
}

var View = Klass.extend(
  [transformableTrait.rename({initialize:"transformableTraitInitialize"})],
  {
    initialize:function(param)
    {
      this.execProto("initialize", param);
      
      this.exec("transformableTraitInitialize", require("director").timeStamp);

      this.slot("comparator", cmpZ);
    },

    getPstnRelativeToModel:function(viewPstn, model, effect)
    {
      var mat = geo.matrixInvert(geo.matrixMult(this.exec("getGameToViewMatrix"), effect.matrix));

      return geo.pointApplyMatrix(viewPstn, mat);
    },

    compareModel:function(painter, model1, matrix1, model2, matrix2)
    {
      if (matrix1.tz == undefined || matrix2.tz == undefined)
        return 0;

      return matrix1.tz - matrix2.tz;
    },
    
    view:function(painter, scene)
    {
      var ctx = painter.exec("getContext", "2d");
      ctx.save();
      
      var mat = this.exec("matrix");
      ctx.setTransform(mat.a, mat.b, mat.c, mat.d, mat.tx, mat.ty);
      
      view(painter, scene);
      
      ctx.restore();
    },
    
    getGameToViewMatrix:function()
    {
      return this.exec("matrix");
    }
  });

exports.TopView = View;

}};