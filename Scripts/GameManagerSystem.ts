
namespace game {
	const BULLET_BASE_RESPAWN_TIME_RANGE : ut.Math.Range = new ut.Math.Range(0.6, 0.9);
	const BULLET_LIMIT_BEFORE_SLOW_RESPAWN : number = 9;
	const BULLET_RESPAWN_SLOW_MULTIPIER : number = 2;
	const BULLET_EXTRA_Y : number = 6;
	const ANIMAL_LIMIT : number = 7;
	const GAME_OVER_DELAY : number = 3;

	@ut.executeBefore(ut.Shared.UserCodeStart)
	export class GameManagerSystem extends ut.ComponentSystem {
		OnUpdate():void {
			let context = this.world.getConfigData(GameContext);
			if(!context.paused)
				context.time += this.scheduler.deltaTime();
			switch (context.state){ 
				case GameState.BeforeStart: {
					if(AbductUtil.IsTitle(this.world))
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
			if(0.5 < context.time && AbductUtil.HasAnyInputDown())
				this.LoadGame();
		}

		OnGameOcurringUpdate(context : GameContext) : GameContext{
			if(this.GetPauseKeyTriggered(context))
				context.paused = !context.paused;
			if(!context.paused){
				if(context.nextBulletTime <= context.time)
					context = this.SpawnBullet(context);
				while(ANIMAL_LIMIT > context.animalCount)
					context = this.SpawnAnimal(context);
			}
			return context;
		}

		Initialize(context : GameContext) : GameContext {
			context.scenery = this.SetupScenery();
			context.inputer = this.SetupInputer();
			context.audioManager = this.SetupAudioManager();
			context.player = this.SetupPlayer();
			context.state = GameState.Ocurring;
			context.paused = false;
			context.gameOverShowTime = 0;
			context.usedLevelInfoArray=this.GenerateUsedLevelInfoArray(this.world.getComponentData(context.scenery, Scenery).levelInfoArray);
			context.score = 0;
			context.topScore = AbductUtil.LoadTopScore();
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

		SetupInputer() : ut.Entity {
			let ret = null;
			this.world.forEach( [ut.Entity, Inputer],(entity, inputer)=>{
				for(let i = 0;i<InputCommand.Action + 5;i++)
					inputer.activeInputArray.push(false);
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
			let bulletEntity = ut.EntityGroup.instantiate(this.world, 'game.Bullet')[0];
			this.world.usingComponentData(bulletEntity, [Bullet, ut.Core2D.TransformLocalPosition], (bullet, tLocalPos)=>{
				const playerPos = this.world.getComponentData(context.player, ut.Core2D.TransformLocalPosition).position;
				const xSign = this.GetBulletXSign();
				tLocalPos.position = playerPos.add(new Vector3(
					xSign*bulletSpawnArea.x,
					reusable.RandomUtil.Range(bulletSpawnArea.y, reusable.RectUtil.Max(bulletSpawnArea).y),
					0
				));
				bullet.direction = this.GetBulletDirection(scenery, tLocalPos.position.y, xSign);
			});
			let multiplier = this.GetBulletCount() > BULLET_LIMIT_BEFORE_SLOW_RESPAWN ? BULLET_RESPAWN_SLOW_MULTIPIER : 1;
			context.nextBulletTime = context.time + multiplier*reusable.RandomUtil.Range(BULLET_BASE_RESPAWN_TIME_RANGE)/context.speed;
			return context;
		}

		// Maybe count in a variable
		GetBulletCount() : number {
			let ret = 0;
			this.world.forEach([Bullet],(bullet)=> ret++);
			return ret;
		}

		GetBulletXSign() : number {
			let xSign = 0;
			let bulletFromLeft = 0;
			let bulletFromRight = 0;
			this.world.forEach( [Bullet],(bullet)=>{
				if(bullet.direction.x > 0)
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

		GetBulletDirection(scenery : Scenery, localBulletPosY:number, xSign:number) : Vector2{
			let ret = new Vector2();
			ret.x = -xSign*scenery.bulletSpawnArea.x*2;
			ret.y = reusable.RandomUtil.Range(GameConstants.Y_MOVEMENT_RANGE) - localBulletPosY;
			if(localBulletPosY < GameConstants.Y_MOVEMENT_RANGE.start)
				ret.y += GameConstants.Y_MOVEMENT_RANGE.start - localBulletPosY;
			if(localBulletPosY > GameConstants.Y_MOVEMENT_RANGE.end)
				ret.y += GameConstants.Y_MOVEMENT_RANGE.end - localBulletPosY;
			ret.normalize();
			return ret;
		}

		SpawnAnimal(context : GameContext){
			let scenery  = this.world.getComponentData(context.scenery, Scenery);
			let animal = ut.EntityGroup.instantiate(this.world, reusable.RandomUtil.SampleArray(context.animalGroupNameArray))[0];
			const maxDistanceFromPlayer = GameConstants.ANIMAL_DESPAWN_MIN_DISTANCE-8;
			this.world.usingComponentData(
				animal, 
				[ut.Core2D.TransformLocalPosition, ut.Core2D.TransformLocalRotation], 
				(tLocalPosition, tLocalRotation)=>{
					const playerPos = this.world.getComponentData(context.player, ut.Core2D.TransformLocalPosition).position;
					const sceneryXRange = AbductUtil.GetSceneryXRange(this.world, scenery);
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
				if(context.gameOverShowTime + 1.3 < context.time && AbductUtil.HasAnyInputDown()){
					this.LoadTitle();
					context = this.world.getConfigData(GameContext);
				}
			}
			return context;
		}

		GetPauseKeyTriggered(context: GameContext) : boolean {
			return this.world.getComponentData(context.inputer, Inputer).activeInputArray[InputCommand.Pause];
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
	}
}