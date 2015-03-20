(function($,document){
    function jQueryPluginFactory( $, methods){
        var Plugin = function(element){
            this.element = element;
        };
        Plugin.prototype = methods;

        $.fn.usmap = function(params){
            var args = arguments;
            this.each(function(){
                var $this = $(this);
                var plugin = $this.data('plugin-'+name);

                // Init the plugin if first time
                if( !plugin ){
                    plugin = new Plugin($this);
                    $this.data('plugin-'+name, plugin);
                    if(plugin.createMap){
                        plugin.createMap.apply(plugin, args);
                    }
                }
            });
            return $(this).data('plugin-'+name);
        }
        
    }
    var defaults = {
        paths: us_paths,
        stateStyles: {
            opacity: 1,
            fill: '#EFEFEF',
            stroke: "#666",
            cursor: 'pointer'
        },
        stateHoverStyles: {
            opacity: 0.8,
            fill: '#BDC0C5',
            stroke: "#666"
        },
        stateTextStyles: {
            opacity: 1,
            fill: 'black',
            'font-weight': 'bold',
            cursor: 'pointer'
        },
        stateTextHoverStyles: {
            opacity: 1,
            fill: 'white',
            'font-weight': 'bold'
        },
        stateSpecificStyles: {},
        stateSpecificHoverStyles: {},
        tooltipStyles:{
            position: 'absolute',
            border: 'solid 1px #CDCDCD',
            'border-radius': '3px',
            background: '#292929',
            color: 'white',
            'font-family': 'sans-serif, Verdana',
            'font-size': 'smaller',
            padding: '3px',
            display: 'none'
        },
        stateExtraText: {},
        tooltip: null,
        showStateText: true,
        textDoNotShow: [],
        stateHoverAnimation: 0
    }
    var extraMethods = {
        changeSpecificStateStyle: function(stateName,style){
            var shape = this.stateShapes[stateName];
            this.options.stateSpecificStyles[stateName] = style;
            shape.attr(style);
        },
        setText: function(stateName,text){
            var textField = this.stateTexts[stateName];
            textField.node.textContent = text;
        },
        setTooltip: function(tooltip){
            this.options.tooltip = tooltip;
        }
    }
    var methods = {
        createMap: function(options){
            var element = this.element;
            var WIDTH = 930,
                HEIGHT = 630;
            var width = element.width(),
                height = element.height();
            this.paper = new Raphael(document.getElementById(element[0].id), width, height);
            // Scale to fit
            this.paper.setViewBox(0, 0, WIDTH, HEIGHT, false);

            this.stateShapes = {};
            this.stateTexts = {};
            this.options = {};
            $.extend(this.options,defaults,options);

            //create tool tip
            if(this.options.tooltip!=null){
              this.tooltip = document.createElement("div");
              document.getElementById(element[0].id).appendChild(this.tooltip);
              this.tooltip.id = 'tooltip';
              $.extend(this.tooltip.style,this.options.tooltipStyles);
            }

            //prepare methods
            for (m in extraMethods) {
                this[m] = extraMethods[m];
            }

            this.createStates();
        },
        createStates: function(){
            var paths = this.options.paths;

            for(var state in paths) {
                var stateAttr = {},
                    specificStyle = this.options.stateSpecificStyles[state],
                    stateStyle = this.options.stateStyles;

                if(specificStyle){
                  $.extend(stateAttr,stateStyle,specificStyle);
                }else{
                    stateAttr = stateStyle;
                }

                this.stateShapes[state] = this.paper.path(paths[state].shape).attr(stateAttr);
        
                var x = paths[state].textPointX,
                    y = paths[state].textPointY;
                this.stateTexts[state] = null;
                if(x && y){
                    var text = '';
                    if(this.options.showStateText && this.options.textDoNotShow.indexOf(state)==-1){
                        text += state+'\n';
                    }

                    if(this.options.stateExtraText[state]){
                        text += this.options.stateExtraText[state].join('\n');
                    }
                    if(text!=''){
                        this.stateTexts[state] = this.paper.text(x,y,text).attr(this.options.stateTextStyles);
                    }
                }

                //prepare event data
                var stateData = {
                    name: state,
                    fullName: paths[state].fullName,
                    shape: this.stateShapes[state],
                    text: this.stateTexts[state]
                }
                this.stateShapes[state].node.stateData = stateData;

                //trigger event
                this._onMouseOverProxy = $.proxy(this, '_onMouseOver');
                this._onMouseOutProxy = $.proxy(this, '_onMouseOut');
                this._onClickProxy = $.proxy(this, '_onClick');
                this._onMouseMoveProxy = $.proxy(this, '_onMouseMove');

                $(this.stateShapes[state].node).on('mouseover', this._onMouseOverProxy);
                $(this.stateShapes[state].node).on('mouseout', this._onMouseOutProxy);
                $(this.stateShapes[state].node).on('click', this._onClickProxy);
                $(this.stateShapes[state].node).on('mousemove', this._onMouseMoveProxy);
        
                if(this.stateTexts[state]!=null){
                    this.stateTexts[state].node.stateData = stateData;
                    $(this.stateTexts[state].node).on('mouseover', this._onMouseOverProxy);
                    $(this.stateTexts[state].node).on('mouseout', this._onMouseOutProxy);
                }
            }
        },
        _onClick: function(event) {
            var stateData = event.currentTarget.stateData;

            if(!this.stateShapes[stateData.name]) return;
          
            this.triggerEvent('click', event, stateData);
        },
        _onMouseOut: function(event) {
            var stateData = event.currentTarget.stateData;

            if(!this.stateShapes[stateData.name]) return;
          
            this.triggerEvent('mouseout', event, stateData);
        },
        _onMouseOver: function(event) {
            var stateData = event.currentTarget.stateData;

            if(!this.stateShapes[stateData.name]) return;
          
            this.triggerEvent('mouseover', event, stateData);
        },
        _onMouseMove: function(event){
            if(this.options.tooltip==null) return;

            this.tooltip.style.left = event.clientX+20+'px';
            this.tooltip.style.top = event.clientY-20+'px';
        },
        triggerEvent:function(type,event,stateData){
            var name = stateData.name;
            var noDefaultAction = false;
      
            var gEvent = $.Event('usmap'+type);
            gEvent.originalEvent = event;
            if(this.options[type]) {
                noDefaultAction = this.options[type](gEvent, stateData) === false || noDefaultAction;
            }
            if(!gEvent.isPropagationStopped()) {
                this.element.trigger(gEvent, [stateData]);
                noDefaultAction = noDefaultAction || gEvent.isDefaultPrevented();
            }
            
      
            // Do the default action
            if(!noDefaultAction) {
                switch(type) {
                    case 'mouseover':
                        this.mouseOverDefaultAction(event,stateData);
                        break;
              
                    case 'mouseout': 
                        this.mouseOutDefaultAction(event,stateData);
                        break;
                }
            }
        },
        mouseOverDefaultAction: function(event,stateData){
            this.paper.safari();

            var stateAttr = {},
                specificHoverStyle = this.options.stateSpecificHoverStyles[stateData.name],
                stateHoverStyle = this.options.stateHoverStyles;

            if(specificHoverStyle){
                $.extend(stateAttr,stateHoverStyle,specificHoverStyle);
            }else{
                stateAttr = stateHoverStyle;
            }

            stateData.shape.animate(stateAttr, this.options.stateHoverAnimation);
            if(stateData.text!=null){
                stateData.text.animate(this.options.stateTextHoverStyles,this.options.stateHoverAnimation);
            }

            if(this.options.tooltip!=null){
                var stateData = event.currentTarget.stateData,
                    tooltip = this.options.tooltip;
                if(typeof tooltip == 'function'){
                    if(tooltip(stateData.name)==''){
                        $('#tooltip').hide();
                    }else{
                        $('#tooltip').html(tooltip(stateData.name)).show();
                    }
                    
                }else if(typeof tooltip == 'string'){
                    $('#tooltip').html(tooltip).show();
                }
            }
        },
        mouseOutDefaultAction: function(event,stateData){
            var stateAttr = {},
                specificStyle = this.options.stateSpecificStyles[stateData.name],
                stateStyle = this.options.stateStyles;

            if(specificStyle){
                $.extend(stateAttr,stateStyle,specificStyle);
            }else{
                stateAttr = stateStyle;
            }
            stateData.shape.animate(stateAttr, this.options.stateHoverAnimation);
            if(stateData.text!=null){
                stateData.text.animate(this.options.stateTextStyles,this.options.stateHoverAnimation);
            }

            if(this.options.tooltip!=null){
                $('#tooltip').hide();
            }
        }
    }

    jQueryPluginFactory($,methods);

})(jQuery,document)