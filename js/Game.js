var Game = {

difficulty: 'easy',
images: ['img/sprite.png', 'img/close.png', 'img/GO.jpg', 'img/logo_zygomatic.png', 'img/blank.png', 'img/white.gif', 'img/black.gif'],
fonts: [],

turn: -1,
pegs: [],
oldPegs: [],
olderPegs: [],
cells: [],
pegSize: 25,
last_move: [],
captures: [0,0,0],
winner: 0,
player: 1,
computer: 1,
AILevel: 1,
next_player: [0, 2, 1],
baseURL: 'img/',
world: null,
worker: new Worker('js/Logic.js'),
gameActive: false,
handi: 0,

restart: function(player)
{
	if (Game.gameActive) {
		if (!confirm(GameLib.word(110 /* Are you sure? */))) { return; }
	}

	if (player)
		Game.player = player;
	$('.peg').remove();
	$('#yourTurn,#myTurn,#youWin,#youLoose,#draw').hide();

	Game.world.addClass('rotateOut animated1s').one(GameLib.animEnd, function(){
		Game.world.removeClass('rotateOut animated1s');
		Game.playAs(Game.player);
	});
},

toggleMusic: function()
{
	if (GameSound.musicMuted) {
		GameSound.muteMusic(false);
		$('.audio .music').addClass('on');
	}
	else {
		GameSound.muteMusic(true);
		$('.audio .music').removeClass('on');
	}
},

toggleSound: function()
{
	if (GameSound.soundMuted) {
		GameSound.muteSound(false);
		$('.audio .sound').addClass('on');
	}
	else {
		GameSound.muteSound(true);
		$('.audio .sound').removeClass('on');
	}
},

showMenu: function()
{
	GameLib.resetHistory()
	GameLib.closePopup();
	GameSound.stopMusic();
	Game.gameDiv.hide();
	Game.menuDiv.show();
	ThirdParty.mainMenu();
},

showHelp: function()
{
	ThirdParty.gameHelp();
	var html = [
		'<p>' + GameLib.word(105 /* Game help */) + '</p>',
		// '<p>' + GameLib.word(106 /* On touch screens */) + '</p>',
		'<div class="buttons">',
		'<p><button class="large awesome" onclick="GameLib.closePopup()">' + GameLib.word(3 /* Close */) + '</button></p>',
		'</div>'
	];
	GameLib.showPopup(GameLib.word(104 /* How to play Sokoban */) , html.join(''), 400, 200, true, GameLib.resetHistory);
},

startGame: function(difficulty)
{
	if (typeof difficulty == 'undefined') {
		difficulty = Game.difficulty;
	};
	Game.difficulty = difficulty;

	var diffs = {easy:1, medium:2, hard:3};
	Game.AILevel = diffs[Game.difficulty];

	$('#youWin,#youLoose,#draw').hide();

	if (typeof GameAds !== 'undefined' && GameAds.showAd()) {
		// HTC One stock browser doesn't like to immediately call requestAds...
		GameSound.ping();
		setTimeout(function() { GameAds.requestAd(Game.showGame) }, 0);
	}
	else {
		Game.showGame();
	}
},

pause: function()
{
	if (!Game.world.is(':visible') || $('#pauseDiv').length > 0) return;
	var html = [
		'<div id="pauseDiv">',
		'<p><div class="audio">' + $('div.audio').eq(0).html() + '</div></p>',
		'<div class="buttons">',
		'<p><button class="large awesome" onclick="Game.showMenu()">' +  GameLib.word(10 /* Menu */)  + '</button></p>',
		'<p><button class="large awesome" onclick="GameLib.closePopup()">' + GameLib.word(6 /* Continue */) + '</button></p>',
		'</div></div>'
	];
	GameLib.showPopup(GameLib.word(5 /* Pause */), html.join(''), 400, 240, true, Game.unpause);
},

unpause: function()
{
	GameLib.closePopup();
},

showGame: function()
{
	// Pause when idle. Wait a bit, so you don't get pause popup when reloading:
	window.addEventListener('idle', function() { setTimeout(Game.pause, GameLib.isTouch ? 0 : 300) }, false);

	ThirdParty.gameStart();
	$('#helpDiv').hide();
	//GameSound.playMusic(); // Don't wait, iPad doesn't like that
	Game.menuDiv.hide();
	Game.gameDiv.show();

	var wmap = {easy:118, medium:119, hard:120, expert:121};
	$('#difficulty').html(GameLib.word(wmap[Game.difficulty]));

	Game.playAs(-1); // Start as white
},

////////////////////////////////////////////////////////////////////////////////////////

/*
 * Find out if there's 4-in-a-row. If so, return the coordinates of the 4 pegs.
 */

// player == 1: player
// player == 2: computer
win: function(winner, message)
{
		$('#yourTurn,#myTurn,#youWin,#youLoose,#draw,#playerInfo,#comuterInfo').hide();

	Game.gameActive = false;
	GameSound.stopMusic();
	ThirdParty.levelComplete();

	switch(winner){
		case "computer":
			$('#youLoose').fadeIn();
			$('#message').show();
			$('#message').text(GameLib.word(195)+ message + GameLib.word(197));
			break;

		case "player":
			$('#youWin').fadeIn();
			$('#message').show();
			GameSound.playSound('youwin');
			$('#message').text(GameLib.word(196)+ message + GameLib.word(197));
			break;

		case "draw":
			$('#draw').fadeIn();
			break
	}

},

playOn: function(col, row, player)
{
	this.worker.postMessage({col:col, row:row, ai:1, level:this.AILevel, reset:false, handicap:this.handi});

},


// player=1: white, player=-1: black
dropPeg: function(pos, message)
{

		var pos = this.positionToArray(pos);
		$('.peg').remove();

		for (var i = 0; i < 19; i++) {
			for (var j = 0; j < 19; j++){
				if (pos[i][j]==1*this.computer) {
						$('<img>', {id:'peg_' + j + '_' + i, 'class':'peg', src:'img/' + 'white'+ '.gif'})
							.css({left:(j*this.pegSize)+'px', top:(i * this.pegSize)+'px'})
							.appendTo('#pegsDiv')
					} else if(pos[i][j] == -1*this.computer){
						$('<img>', {id:'peg_' + j + '_' + i, 'class':'peg', src:'img/' + 'black' + '.gif'})
							.css({left:(j*this.pegSize)+'px', top:(i * this.pegSize)+'px'})
							.appendTo('#pegsDiv')
				}
				this.olderPegs[i][j] = this.oldPegs[i][j];
				this.oldPegs[i][j] = this.pegs[i][j];
				this.pegs[i][j] = pos[i][j];
				if (this.addedRecently(i, j))
					$('#peg_' + j + '_' + i).css('border', 'thin red solid')
				if (this.removedRecently(i, j)) {

					if (this.oldPegs[i][j]==1*this.computer) {
						$('<img>', {id:'peg_' + j + '_' + i, 'class':'peg', src:'img/' + 'white'+ '.gif'})
							.css({left:(j*this.pegSize)+'px', top:(i * this.pegSize)+'px'})
							.appendTo('#pegsDiv')
					} else if(this.oldPegs[i][j] == -1*this.computer){
						$('<img>', {id:'peg_' + j + '_' + i, 'class':'peg', src:'img/' + 'black' + '.gif'})
							.css({left:(j*this.pegSize)+'px', top:(i * this.pegSize)+'px'})
							.appendTo('#pegsDiv')
					}
					setTimeout(function() { GameSound.playSound(this.turn == Game.computer ? 'pegsdrop1' : 'pegsdrop2'); }, 8);
					$('#peg_' + j + '_' + i).fadeOut(250).fadeIn(250).fadeOut(250).fadeIn(250).fadeOut(250, function() { $(this).remove(); })
				}
			}
		}

	setTimeout(function() { GameSound.playSound(this.turn == Game.computer ? 'pegdrop1' : 'pegdrop2'); }, 8);
},

positionToArray: function(positionString)
	{
		var output = new Array(19);
		for (var i = 0; i < 19; i++) {
			output[i] = new Array(19);
			for (var j = 0; j < 19; j++)
				output[i][j] = positionString[j*19 + i];
		};
		return output;
	},

// Removed underscore.js dependency
initWorker: function()
{
	var _this = this;
	this.worker.addEventListener('message', function(data) {
		var m = data.data;
		// console.log("one: "+[m['one']]);
		if (_this.player==1) {
			playerScore = m['one'];
			computerScore = m['two'];
		}else{
			playerScore = m['two'];
			computerScore = m['one'];
		}
		$('#playerScore').text("("+playerScore+")");
		$('#computerScore').text("("+computerScore+")");
		// console.log("two: "+[m['two']]);
		if (m['think']) {
			$('#notEasyModeProgress').val(m['think'] * 100);
		}else{
			$('#notEasyModeProgress').val(0);
			$('#youWin,#youLoose,#draw,#message,#playerInfo,#comuterInfo').hide();

			if (m['message'] != ''){
					$('#message').show();
					setTimeout(function(){$('#message').hide();$('#playerInfo,#comuterInfo').show();}, 1000);
					$('#message').text(_this.setMessage(m['message']));
				}
				else{
					$('#playerInfo,#comuterInfo').show();
			}
			if (m['winner'] != null) {
				var winner = m['winner'];
				// $('#yourTurn,#myTurn,#youWin,#youLoose,#draw').hide();
				_this.win(winner, m['message']);

			}
			else{
				if (m['canDrop']) {
					_this.turn*=-1;
					_this.dropPeg(m['board'], m['canDrop'])}

					if (_this.turn == _this.player) {
						setTimeout(function(){$('#myTurn').hide();},100);
						if (m['message'] == '')
							setTimeout(function(){$('#yourTurn').show();},100);
						else
							setTimeout(function(){$('#yourTurn').show();},1000);
					}
					else {
						setTimeout(function(){$('#yourTurn').hide();},100);
						if (m['message'] == '')
							setTimeout(function(){$('#myTurn').show();},100);
						else
							setTimeout(function(){$('#myTurn').show();},1000);
					}
				// }
			}
		}
	})
},

playAs: function(player)
{
	$('#youWin,#youLoose,#draw').hide();
	$('.peg').remove();
	Game.gameActive = true;

	var playerColor = (player == 1) ? 'white' : 'black';
	var computerColor = (player == 1) ? 'black' : 'white';

	$('#playerImg').prop('src', 'img/' + playerColor + '.gif');
	$('#computerImg').prop('src', 'img/' + computerColor + '.gif');

	this.turn = -1;
	this.player = player;
	this.computer = player * -1;
	this.handi = this.calcHandi($('#selectedHandi').text());
	this.worker.postMessage({turn:this.computer, ai:1, level:this.AILevel, reset:true, handicap:this.handi});
	if (this.AILevel == 1) {
		$('#easyModeProgress').show();
		$('#notEasyModeProgress').hide();
	}
	else{
		$('#easyModeProgress').hide();
		$('#notEasyModeProgress').show();	
	}
	this.drawHandi(this.handi);
	// console.log("handi:  "+this.handi)
	//GameSound.playSound('pegsdrop1');
	GameSound.playMusic(); // Don't wait, iPad doesn't like that

	if (this.turn == this.computer) {
		$('#yourTurn').hide(); $('#myTurn').show();
	}
	else {
		$('#myTurn').hide(); $('#yourTurn').show();
	}
	this.pegs = new Array(19);
	this.oldPegs = new Array(19);
	this.olderPegs = new Array(19);
	for (var i = 0; i < 19; i++) {
		this.pegs[i] = new Array(19);
		this.oldPegs[i] = new Array(19);
		this.olderPegs[i] = new Array(19);
		for (var j = 0; j < 19; j++) {
			this.pegs[i][j] = 0;
			this.oldPegs[i][j] = 0;
			this.olderPegs[i][j] = 0;
		};
	};
},

setStatus: function(text)
{
	if (GameConfig.debug) {
		console.log(text);
	}
},

pass: function(){
	if (this.turn == this.player) {
		this.turn *= -1;
		$('#yourTurn').hide(); $('#myTurn').show();
		this.worker.postMessage({pass:true, handicap:this.handi});
	}
},

create: function ()
{
	var rectGraphics;
	var _this=this
	for(var i = 0; i < 19; i++) {
		this.cells[i] = [];
		for(var j = 0; j < 19; j++) {
			switch(j) {
				case 0:
					switch(i) {
						case 0:
							src = 'ptopl'
							break;
						case 19-1:
							src = 'ptopr'
							break;
						default:
							src = 'ptop'
							break;
					}
					break;
				case 19-1:
					switch(i) {
						case 0:
							src = 'pbottoml'
							break;
						case 19-1:
							src = 'pbottomr'
							break;
						default:
							src = 'pbottom'
							break;
					}
					break
				default:
					switch(i) {
						case 0:
							src = 'pleft'
							break;
						case 19-1:
							src = 'pright'
							break;
						default:
							src = 'pback'
							break;
					}
			}
			// if (i >= 7 && i <= 11 && j >= 7 && j <= 11) {
			// 	src = 'pbackl'
			// }
			// if (i == 9 && j == 9) {
			// 	src = 'pbacklc'
			// }

			rectGraphics = $('<div />');
			rectGraphics.css({
				backgroundImage: 'url(img/'+src+'.gif)',
				left: (i*this.pegSize) + 'px',
				top: (j*this.pegSize) + 'px'
			})

			.on('mouseover', function(col, row){ return function () {
				$(this).data('original-opacity', $(this).css('opacity'))
				if(_this.turn == _this.player) {
					$(this).css('opacity', '1.0')
				}
			}}(i,j))

			.on('mouseout', function(){
				$(this).css('opacity', $(this).data('original-opacity'))
			})

			.on('click', function(sprite, col, row){ return function () {
				if (_this.turn == _this.player) {
					_this.playOn(col, row, _this.player);
				}
			}}(rectGraphics, i,j));
			this.world.append(rectGraphics);
			this.cells[i][j] = rectGraphics;
		}
	}
},

////////////////////////////////////////////////////////////////////////////////////////

init: function()
{
	Game.containerDiv = $('#gameContainer');
	Game.menuDiv = $('#menuDiv');
	Game.gameDiv = $('#gameDiv');
	Game.world = $('#gameBoard #overlayDiv');

	// Toggle fullscreen
	if (ThirdParty.enableFullscreenToggle && screenfull.enabled) {
		$('.audio').append('<div class="sprite fullscreen" title="Toggle fullscreen" onclick="screenfull.toggle()">');
		document.addEventListener(screenfull.raw.fullscreenchange, function() {
			$('.fullscreen').toggleClass('on');
		});
	}
	// /Toggle fullscreen

	if (GameSound.musicMuted) {
		$('.audio .music').removeClass('on');
	}
	if (GameSound.soundMuted) {
		$('.audio .sound').removeClass('on');
	}

	Game.showMenu();

	Game.create();
	Game.initWorker();

	// Game.startGame('easy');
},

setHandi: function(handi)
{
	$('#selectedHandi').html("handi "+handicap);
},

calcHandi: function(handiText){
	return parseInt(handiText.match(/\d+/)[0]);
},

drawHandi: function(n){
		$('.peg').remove();
	var positions = [];

	switch(n){
		case 2:
			positions.push([3, 15]);
			positions.push([15, 3]);
		break;

		case 3:
			positions.push([3, 15]);
			positions.push([15, 3]);
			positions.push([15, 15]);
		break;
		case 4:
			positions.push([3, 15]);
			positions.push([15, 3]);
			positions.push([15, 15]);
			positions.push([3, 3]);
		break;
		case 5:
			positions.push([3, 15]);
			positions.push([15, 3]);
			positions.push([15, 15]);
			positions.push([9, 9]);
			positions.push([3, 3]);

		break;
		case 6:
			positions.push([3, 3]);
			positions.push([9, 3]);
			positions.push([15, 3]);
			positions.push([3, 15]);
			positions.push([9, 15]);
			positions.push([15, 15]);
		break;
		case 7:
			positions.push([3, 3]);
			positions.push([9, 3]);
			positions.push([15, 3]);
			positions.push([3, 15]);
			positions.push([9, 15]);
			positions.push([15, 15]);
			positions.push([9, 9]);
		break;
		case 8:
			positions.push([3, 3]);
			positions.push([9, 3]);
			positions.push([15, 3]);
			positions.push([3, 15]);
			positions.push([9, 15]);
			positions.push([15, 15]);
			positions.push([3, 9]);
			positions.push([15, 9]);
		break;
		case 9:
			positions.push([3, 3]);
			positions.push([9, 3]);
			positions.push([15, 3]);
			positions.push([3, 15]);
			positions.push([9, 15]);
			positions.push([15, 15]);
			positions.push([3, 9]);
			positions.push([15, 9]);
			positions.push([9, 9]);
		break;
	}
	for (var i = 0; i < positions.length; i++) {
		x = positions[i][0];
		y = positions[i][1];
		$('<img>', {id:'peg_' + x + '_' + y, 'class':'peg', src:'img/' + 'black' + '.gif'})
							.css({left:(x*this.pegSize)+'px', top:(y * this.pegSize)+'px'})
							.appendTo('#pegsDiv')
	};
	if(n != 0){
		this.turn *=-1;
	}
},

setMessage: function(message){
	// console.log(message);
	switch(message){
		case "suicide":
			return GameLib.word(190);

		case "Ko":
			return GameLib.word(191);

		case "computer passed endOfGame":
			return GameLib.word(192);

		case "pass":
			return GameLib.word(193);

		case "player passed endOfGame":
			return GameLib.word(194);
		default :return "";
	}
},

addedRecently: function(x, y){
	if (this.oldPegs[x][y] == 0 && this.pegs[x][y] != 0)
		return true;
	if (this.olderPegs[x][y] == 0 && this.oldPegs[x][y] != 0)
		return true;
	return false;
},

removedRecently: function(x, y){
	if (this.oldPegs[x][y] != 0 && this.pegs[x][y] == 0)
		return true;
	else return false;
},

};
