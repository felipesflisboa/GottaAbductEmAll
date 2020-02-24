
namespace game {
	const BULLET_BASE_RESPAWN_TIME_RANGE : ut.Math.Range = new ut.Math.Range(0.6, 0.9);
	const BULLET_BASE_SPEED : number = 10;
	const BULLET_EXTRA_Y : number = 6;
	const ANIMAL_LIMIT : number = 7;
	const GAME_OVER_DELAY : number = 3;
	const SCORE_KEY : string = "AbductTopScore";

	@ut.executeBefore(ut.Shared.UserCodeStart)
	export class GameManagerSystem extends ut.ComponentSystem {
		OnUpdate():void {
			let context = this.world.getConfigData(GameContext);
			context.time += this.scheduler.deltaTime();
			switch (context.state){ 
				case GameState.BeforeStart: {
					if(GameManagerSystem.IsTitle(this.world))
						this.OnTitleScreenUpdate(context);
					else
						context = this.Initialize(context);
					break;
				}
				case GameState.Ocurring: {
					context = this.OnGameOcurringUpdate(context);
					break;
				}
				case GameState.Ended: {
					context = this.OnGameEndUpdate(context);
					break;
				}
			}
			this.world.setConfigData(context);
		}

		OnTitleScreenUpdate(context : GameContext) : void {
			if(0.5 < context.time && GameManagerSystem.HasAnyInputDown())
				this.LoadGame();
		}

		OnGameOcurringUpdate(context : GameContext) : GameContext{
			if(context.nextBulletTime <= context.time)
				context = this.SpawnBullet(context);
			while(ANIMAL_LIMIT > context.animalCount)
				context = this.SpawnAnimal(context);
			return context;
		}

		Initialize(context : GameContext) : GameContext {
			context.scenery = this.SetupScenery();
			context.audioManager = this.SetupAudioManager();
			context.player = this.SetupPlayer();
			context.state = GameState.Ocurring;
			context.gameOverShowTime = 0;
			context.usedLevelInfoArray=this.GenerateUsedLevelInfoArray(this.world.getComponentData(context.scenery, Scenery).levelInfoArray);
			context.score = 0;
			context.topScore = GameManagerSystem.LoadTopScore();
			context.speed = context.usedLevelInfoArray[context.score].speed;
			context.time = 0;
			context.nextBulletTime = 0;
			context.animalCount = 0;
			return context;
		}

		SetupScenery() : ut.Entity {
			let ret = null;
			this.world.forEach( [ut.Entity, Scenery],(entity, scenery)=>{
				const spawnXDistanceToPlayer = GameConstants.SCREEN_SIZE.x/2+2;
				scenery.bulletSpawnArea = new ut.Math.Rect(
					-spawnXDistanceToPlayer,
					GameConstants.Y_MOVEMENT_RANGE.start - BULLET_EXTRA_Y,
					spawnXDistanceToPlayer*2,
					GameConstants.Y_MOVEMENT_RANGE.end - GameConstants.Y_MOVEMENT_RANGE.start + BULLET_EXTRA_Y*2,
				);
				ret = new ut.Entity(entity.index, entity.version);
			});
			return ret;
		}

		SetupAudioManager() : ut.Entity {
			let ret = null;
			this.world.forEach( [ut.Entity, AudioManager],(entity, audioManager)=>{
				audioManager.lastPlayedAudio = new ut.Entity(0,0);
				ret = new ut.Entity(entity.index, entity.version);
			});
			return ret;
		}
		
		SetupPlayer() : ut.Entity {
			let ret = null;
			this.world.forEach( [ut.Entity, Player],(entity, player)=>{
				player.extraLiveCount = GameConstants.PLAYER_INITIAL_EXTRA_LIVE_COUNT;
				ret = new ut.Entity(entity.index, entity.version);
			});
			return ret;
		}

		GenerateUsedLevelInfoArray(levelInfoArray : LevelInfo[]) : UsedLevelInfo[] {
			let biggerScore = -1;
			levelInfoArray.forEach(e => biggerScore = Math.max(biggerScore, e.score));
			let ret = Array<UsedLevelInfo>(biggerScore+1);
			levelInfoArray.sort((e1 , e2) => e1.score - e2.score);
			for (let i = 0; i+1 < levelInfoArray.length; i++) {
				for (let score = levelInfoArray[i].score ; score <= levelInfoArray[i+1].score; score++) {
					let scoreRatio = (score-levelInfoArray[i].score)/(levelInfoArray[i+1].score-levelInfoArray[i].score);
					ret[score] = new UsedLevelInfo();
					ret[score].speed = levelInfoArray[i].speed + scoreRatio*(levelInfoArray[i+1].speed-levelInfoArray[i].speed);
				}
			}
			return ret;
		}

		SpawnBullet(context : GameContext){
			let scenery  = this.world.getComponentData(context.scenery, Scenery);
			let bulletSpawnArea  = scenery.bulletSpawnArea;
			let bullet = ut.EntityGroup.instantiate(this.world, 'game.Bullet')[0];
			this.world.usingComponentData(bullet, [ut.Core2D.TransformLocalPosition, ut.Physics2D.Velocity2D], (tLocalPos, velocity)=>{
				const playerPos = this.world.getComponentData(context.player, ut.Core2D.TransformLocalPosition).position;
				let xSign = this.GetBulletXSign();
				tLocalPos.position = playerPos.add(new Vector3(
					xSign*bulletSpawnArea.x,
					reusable.RandomUtil.Range(bulletSpawnArea.y, reusable.RectUtil.Max(bulletSpawnArea).y),
					0
				));
				let setVelocity = new ut.Physics2D.SetVelocity2D();
				setVelocity.velocity = this.GetBulletVelocity(context, scenery, tLocalPos.position.y, xSign);
				this.world.addComponentData(bullet, setVelocity);
			});
			context.nextBulletTime = context.time + reusable.RandomUtil.Range(BULLET_BASE_RESPAWN_TIME_RANGE)/context.speed;
			return context;
		}

		GetBulletXSign() : number {
			let xSign = 0;
			let bulletFromLeft = 0;
			let bulletFromRight = 0;
			this.world.forEach( [Bullet, ut.Physics2D.Velocity2D],(bullet, velocity)=>{
				if(velocity.velocity.x > 0)
					bulletFromLeft++;
				else
					bulletFromRight++;
			});
			if(bulletFromLeft+bulletFromRight > 5){
				if(bulletFromLeft>=bulletFromRight*2){
					xSign = -1;
				}else if(bulletFromRight>=bulletFromLeft*2) {
					xSign = 1;
				}
			}
			if(xSign==0)
				xSign = Math.random() > 0.5 ? 1 : -1;
			return xSign;
		}

		GetBulletVelocity(context : GameContext, scenery : Scenery, localBulletPosY:number, xSign:number) : Vector2{
			let ret = new Vector2();
			ret.x = -xSign*scenery.bulletSpawnArea.x*2;
			ret.y = reusable.RandomUtil.Range(GameConstants.Y_MOVEMENT_RANGE) - localBulletPosY;
			if(localBulletPosY < GameConstants.Y_MOVEMENT_RANGE.start)
				ret.y += GameConstants.Y_MOVEMENT_RANGE.start - localBulletPosY;
			if(localBulletPosY > GameConstants.Y_MOVEMENT_RANGE.end)
				ret.y += GameConstants.Y_MOVEMENT_RANGE.end - localBulletPosY;
			ret.normalize();
			ret.multiplyScalar(context.speed * BULLET_BASE_SPEED);
			return ret;
		}

		SpawnAnimal(context : GameContext){
			let scenery  = this.world.getComponentData(context.scenery, Scenery);
			let animal = ut.EntityGroup.instantiate(this.world, reusable.RandomUtil.SampleArray(context.animalGroupNameArray))[0];
			const maxDistanceFromPlayer = GameConstants.SCREEN_SIZE.x/2+2;
			this.world.usingComponentData(
				animal, 
				[ut.Core2D.TransformLocalPosition, ut.Core2D.TransformLocalRotation], 
				(tLocalPosition, tLocalRotation)=>{
					const playerPos = this.world.getComponentData(context.player, ut.Core2D.TransformLocalPosition).position;
					const sceneryXRange = GameManagerSystem.GetSceneryXRange(this.world, scenery);
					do{
						var randomPosX = reusable.RandomUtil.Range(sceneryXRange);
						//TODO maybe a Math.floor
					}while(context.time > 1 && Math.abs(playerPos.x-randomPosX) < maxDistanceFromPlayer)
					tLocalPosition.position = new Vector3(randomPosX, GameConstants.GROUND_POS_Y, 0);
					if(Math.random() > 0.5)
						tLocalRotation.rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
				}
			);
			context.animalCount++;
			return context;
		}

		OnGameEndUpdate(context: GameContext) : GameContext{
			if(context.gameOverShowTime == 0){
				context.gameOverShowTime = GAME_OVER_DELAY + context.time;
			}else if(context.gameOverShowTime < context.time){
				if(context.gameOverShowTime + 0.5 < context.time && GameManagerSystem.HasAnyInputDown()){
					this.LoadTitle();
					context = this.world.getConfigData(GameContext);
				}
			}
			return context;
		}

		static GetSceneryXRange(world: ut.World, scenery:Scenery): ut.Math.Range{
			return new ut.Math.Range(
				world.getComponentData(scenery.leftCornerZone,ut.Core2D.TransformLocalPosition).position.x - GameConstants.ZONE_WIDTH/2,
				world.getComponentData(scenery.rightCornerZone,ut.Core2D.TransformLocalPosition).position.x + GameConstants.ZONE_WIDTH/2,
			);
		}

		LoadGame() : void{
			ut.EntityGroup.destroyAll(this.world, 'game.Title');
			ut.EntityGroup.instantiate(this.world, 'game.Game');
		}

		LoadTitle(): void {
			let context = this.world.getConfigData(GameContext);
			context.state = GameState.BeforeStart;
			context.time = 0;
			this.world.setConfigData(context);
			ut.EntityGroup.destroyAll(this.world, 'game.Game');
			ut.EntityGroup.destroyAll(this.world, 'game.Bullet');
			for(const animalEntityName of context.animalGroupNameArray)
				ut.EntityGroup.destroyAll(this.world, animalEntityName);
			ut.EntityGroup.instantiate(this.world, 'game.Title');
		}

		//TODO move
		static IsTitle(world:ut.World) : boolean {
			let ret = true;
			world.forEach( [Scenery],(scenery) => ret = false);
			return ret;
		}

		//TODO move
		static AddPoints(world:ut.World, points:number) : void {
			let context = world.getConfigData(GameContext);
			context.score+=points;
			if(context.score >= context.usedLevelInfoArray.length)
				context.speed = context.usedLevelInfoArray[context.usedLevelInfoArray.length - 1].speed;
			else
				context.speed = context.usedLevelInfoArray[context.score].speed;
		  world.setConfigData(context);
		}

		//TODO move
		static HasAnyInputDown() : boolean {
			return ut.Runtime.Input.getMouseButton(0) || reusable.GeneralUtil.GetKeyDown([
				ut.Core2D.KeyCode.A, 
				ut.Core2D.KeyCode.D, 
				ut.Core2D.KeyCode.S, 
				ut.Core2D.KeyCode.W, 
				ut.Core2D.KeyCode.Keypad0,
				ut.Core2D.KeyCode.Keypad1, 
				ut.Core2D.KeyCode.Keypad2, 
				ut.Core2D.KeyCode.Keypad3, 
				ut.Core2D.KeyCode.Keypad4, 
				ut.Core2D.KeyCode.Keypad5, 
				ut.Core2D.KeyCode.Keypad6, 
				ut.Core2D.KeyCode.Keypad7, 
				ut.Core2D.KeyCode.Keypad8, 
				ut.Core2D.KeyCode.Keypad9, 
				ut.Core2D.KeyCode.Space
			]);
		}

		static LoadTopScore() : number{
			return +reusable.PersistenceUtil.GetCookie(SCORE_KEY);
		}

		static SaveTopScore(value:number) : void{
			reusable.PersistenceUtil.SetCookie(SCORE_KEY, value.toString());
		}

		static GetTimeFormatted(context : GameContext): string{
			return Math.floor(context.time/60)+":"+reusable.GeneralUtil.ExactDigits( Math.floor(context.time) % 60 ,2)
		}
	}
}