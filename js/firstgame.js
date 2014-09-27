var game = new Phaser.Game(288, 505, Phaser.CANVAS, 'gamediv');
game.States = {};

game.States.boot = function() {
	this.preload = function() {
		game.load.image('loading', 'assets/preloader.gif');
	};
	this.create = function() {
		this.input.maxPointers = 1;
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.scale.pageAlignHorizontally = true;
		this.scale.pageAlignVertically = true;
		this.scale.setScreenSize(true);
		game.state.start('preload');
	};
};

game.States.preload = function() {
	this.preload = function() {
		var preloadSprite = game.add.sprite(35, game.height/2, 'loading');
		game.load.setPreloadSprite(preloadSprite);

		game.load.image('background', 'assets/background.png');
		game.load.image('ground', 'assets/ground.png');
		game.load.image('title', 'assets/title.png');
		game.load.spritesheet('bird', 'assets/bird.png', 34, 24, 3, 0, 0);
		game.load.spritesheet('pipe', 'assets/pipes.png', 54, 320, 2, 0, 0);
		game.load.image('btn', 'assets/start-button.png');
		game.load.image('ready', 'assets/get-ready.png');
		game.load.image('gameover', 'assets/gameover.png');
		game.load.image('tip', 'assets/instructions.png');
		game.load.image('scoreboard', 'assets/scoreboard.png');

		game.load.audio('flap', 'assets/flap.wav');
		game.load.audio('hitground', 'assets/ground-hit.wav');
		game.load.audio('hitpipe', 'assets/pipe-hit.wav');
		game.load.audio('getscore', 'assets/score.wav');
		game.load.audio('gameover', 'assets/ouch.wav');

		game.load.bitmapFont('scorefont', 'assets/font.png', 'assets/font.fnt');
	}

	this.create = function() {
		game.state.start('menu');
	};
};

game.States.menu = function() {
	this.create = function() {
		this.bg = game.add.tileSprite(0, 0, game.width, game.height, 'background');
		this.ground = game.add.tileSprite(0, game.height - 112, game.width, 112, 'ground');

		this.bg.autoScroll(-10, 0);
		this.ground.autoScroll(-100, 0);

		var titleGroup = game.add.group();
		titleGroup.create(0, 0, 'title');
		
		this.bird = titleGroup.create(190, 10, 'bird');
		this.bird.animations.add('fly', null, 9, true);
		this.bird.animations.play('fly');

		titleGroup.x = (game.width - 224)/2;
		titleGroup.y = game.height * 0.15;
		game.add.tween(titleGroup).to({y: titleGroup.y + 20}, 1000, null, true, 0, Number.MAX_VALUE, true);
		
		var btn = game.add.button(game.width/2, game.height/2, 'btn', function(){
			game.state.start('play');
		});
		btn.anchor.setTo(0.5, 0.5);
	};
};

game.States.play = function() {
	this.create = function() {
		this.bg = game.add.tileSprite(0, 0, game.width, game.height, 'background');

		this.ready = game.add.image(game.width/2, game.height * 0.1, 'ready');
		this.ready.anchor.setTo(0.5, 0);
		this.tip = game.add.image(game.width/2, game.height*0.5, 'tip');
		this.tip.anchor.setTo(0.5, 0);

		this.pipeGroup = game.add.group();
		this.pipeGroup.enableBody = true;

		this.bird = game.add.sprite(game.width * 0.15, game.height * 0.3, 'bird');
		this.bird.animations.add('fly', null, 9, true);
		this.bird.animations.play('fly');
		this.bird.anchor.setTo(0.5, 0.5);

		this.ground = game.add.tileSprite(0, game.height - 112, game.width, 112, 'ground');

		this.soundFly = game.add.sound('flap');
		this.soundHitGround = game.add.sound('hitground');
		this.soundHitPipe = game.add.sound('hitpipe');
		this.soundScore = game.add.sound('getscore');
		this.soundGameOver = game.add.sound('gameover');

		game.physics.enable(this.bird, Phaser.Physics.ARCADE);
		this.bird.body.gravity.y = 0;
		game.physics.enable(this.ground, Phaser.Physics.ARCADE);
		this.ground.body.immovable = true;

		this.hasStared = false;
		game.time.events.loop(900, this.generatePipe, this);
		game.time.events.stop(false);
		game.input.onDown.addOnce(this.startGame, this);
	};

	this.update = function() {
		if (!this.hasStared) return;//避免游戏停留在menu页时小鸟开始低头
		if (this.bird.angle < 90) this.bird.angle += 3;
		game.physics.arcade.collide(this.bird, this.ground, this.hitGround, null, this);
		game.physics.arcade.overlap(this.bird, this.pipeGroup, this.hitPipe, null, this);
		this.pipeGroup.forEachExists(this.checkScore, this);
	}

	this.startGame = function() {
		this.gameSpeed = 200;
		this.score = 0;

		this.hasStared = true;
		this.gameIsOver = false;
		this.ready.destroy();
		this.tip.destroy();

		this.bg.autoScroll(-(this.gameSpeed/10),0);
		this.ground.autoScroll(-this.gameSpeed,0);
		this.bird.body.gravity.y = 1150;

		this.scoreText = game.add.bitmapText(game.width/2 - 10, game.height*0.15, 'scorefont', '0', 36);
		
		game.time.events.start();
		game.input.onDown.add(this.fly, this);
	};

	this.fly = function() {
		this.bird.body.velocity.y = -350;
		this.soundFly.play();
		game.add.tween(this.bird).to({angle: -30}, 100, null, true, 0, 0, false);	
	};

	this.hitGround = function() {
		if (this.gameIsOver) return;
		this.soundHitGround.play();
		this.gameOver();
	};

	this.hitPipe = function() {
		if (this.gameIsOver) return;
		this.soundHitPipe.play();
		this.gameOver();
	};

	this.generatePipe = function(y) {
		y = y || 30;
		var gap = 150;
		this.upReset = false;
		this.downReset = false;

		var upperPipeY = 30 + Math.floor((game.height - 112 - gap - 10 - 30)*Math.random());
		if (upperPipeY == y)
		{
			this.generatePipe(y);
		} 
		//debug: 确认有重复利用dead pipe，没有造成内存浪费
		//console.log('live pipe:'+this.pipeGroup.countLiving()+'\ndead pipe:'+this.pipeGroup.countDead());
		if (this.pipeGroup.countDead() > 0)
		{
			this.pipeGroup.forEachDead(function(pipe){
				if (pipe.anchor.y == 1)
				{
					pipe.reset(game.width, upperPipeY);
					this.upReset = true;
					pipe.counted = false;//将管道恢复成未计分状态
				}
				else
				{
					pipe.reset(game.width, upperPipeY + gap);
					this.downReset = true;
				}
				pipe.body.velocity.x = -this.gameSpeed;
				if (this.upReset && this.downReset) 
				{
					this.upReset = false;
					this.downReset = false;
					return;
				}
			}, this);
			return;
		}
		
		var topPipe = game.add.sprite(game.width, upperPipeY, 'pipe', 0, this.pipeGroup);
		var bottomPipe = game.add.sprite(game.width, upperPipeY + gap, 'pipe', 1, this.pipeGroup);
		topPipe.anchor.setTo(0, 1);
		bottomPipe.anchor.setTo(0, 0);
		this.pipeGroup.setAll('checkWorldBounds', true);
		this.pipeGroup.setAll('outOfBoundsKill', true);
		this.pipeGroup.setAll('body.velocity.x', -this.gameSpeed);
	};

	this.stopGame = function() {
		game.time.events.stop();
		this.ground.stopScroll();
		this.bg.stopScroll();
		this.pipeGroup.setAll('body.velocity.x', 0);
		this.bird.animations.stop();
		game.input.onDown.remove(this.fly, this);
		this.scoreText.destroy();

		this.soundGameOver.play();

		var scoreGroup = game.add.group();
		var gameOverText = scoreGroup.create(game.width/2, 0, 'gameover');
		gameOverText.anchor.x = 0.5;

		var scoreBoard = scoreGroup.create(game.width/2, 70, 'scoreboard');
		scoreBoard.anchor.x = 0.5;

		var newScore = game.add.bitmapText(game.width/2 + 60, 107, 'scorefont', this.score+'', 20, scoreGroup);//this.score后加引号是为了转化为字符串，否则不能显示
		this.bestScore = this.bestScore || 0;
		if (this.bestScore < this.score) this.bestScore = this.score;
		var bestScore = game.add.bitmapText(game.width/2 + 60, 155, 'scorefont', this.bestScore+'', 20, scoreGroup);

		var btnReplay = game.add.button(game.width/2, 250, 'btn', function(){game.state.start('play')}, this, 0, 0, 0, 0, scoreGroup );
		btnReplay.anchor.x = 0.5;

		scoreGroup.y = 70;

	}

	this.gameOver = function() {
		this.gameIsOver = true;
		this.stopGame();
	}

	this.checkScore = function(pipe) {
		if (pipe.anchor.y == 1 && !pipe.counted)//pipe.counted属性用于避免一根管道重复计分
		{
			if ((pipe.x + 56) <= this.bird.x)
			{
				pipe.counted = true;
				this.score += 1;
				this.soundScore.play();
				this.scoreText.text = this.score;
			}
		}
	}
};

game.state.add('boot', game.States.boot);
game.state.add('preload', game.States.preload);
game.state.add('menu', game.States.menu);
game.state.add('play', game.States.play);
game.state.start('boot');

