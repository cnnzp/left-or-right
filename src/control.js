
__resources__["/control.js"] = {meta: {mimetype: "application/javascript"}, data: function(exports, require, module, __filename, __dirname) {
// var btn_onmouseover = function(evt)
// {
//    evt.target.style.cursor = "pointer";
// };

// var btn_onmouseout = function(evt)
// {
//    evt.target.style.cursor = "default";
// };

var addClass = function(elem, cls)
{
   elem.className += " " + cls;
};

var removeClass = function(elem, cls)
{
   elem.className =
      elem.className.replace(new RegExp('(\\s)*' + cls + '(\\s)*', "g"), ' ');
};

var Button = function(text, clickcb)
{
   var b = document.createElement("button");
   b.className = "control";
   b.id = text;
   
   // b.onmouseover = btn_onmouseover;
   // b.onmouseout = btn_onmouseout;
   
   b.innerText = text;
   
   b.onclick = clickcb;
   
   return b;
};

var start = new Button("START", 
                       function(evt)
                       {
                          require("director").director().exec("getLevel").exec("start");
                       });

var next = new Button("NEXT",
                      function(evt)
                      {
                         require("main").runNextLevel();
                      });

var again = new Button("REPLAY",
                       function(evt)
                       {
                          require("main").runCurLevelAgain();
                       });

var showed = false;

var showControl = function()
{
   if (showed == false)
   {
      var panel = document.getElementById("controlpanel");
      panel.appendChild(start);
      panel.appendChild(next);
      panel.appendChild(again);
      
      disableButtons(next, again);
      
      showed = true;
   }
};

var disableButtons = function()
{
   Array.prototype.forEach.call(arguments,
                                function(arg)
                                {
                                   addClass(arg, "disabledbtn");
                                   arg.disabled = true;
                                });
   
};

var enableButtons = function()
{
   Array.prototype.forEach.call(arguments,
                                function(arg)
                                {
                                   removeClass(arg, "disabledbtn");
                                   arg.disabled = false;          
                                });

};

var startPlay = function()
{
   disableButtons(start, next);
   enableButtons(again);
   
   removeClass(next, "highlight");
};

var levelOver = function()
{
   disableButtons(start);
   enableButtons(next, again);
   
   addClass(next, "highlight");
};

var nextlevel = function()
{
   disableButtons(next, again);
   enableButtons(start);
   
   removeClass(next, "highlight");
};

exports.showControl = showControl;
exports.startPlay = startPlay;
exports.levelOver = levelOver;
exports.nextlevel = nextlevel;

}};