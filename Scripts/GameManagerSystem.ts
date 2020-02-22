
namespace game {
	const BULLET_BASE_RESPAWN_TIME_RANGE : ut.Math.Range = new ut.Math.Range(0.6, 0.9);
	const BULLET_BASE_SPEED : number = 10;
	const BULLET_EXTRA_Y : number = 6;
	const ANIMAL_LIMIT : number = 5;
	const GROUND_POS_Y : number = -20;
	const ZONE_WIDTH : number = 256;
	const ZONE_BORDER_TO_MOVE : number = 56;
	const Y_MOVEMENT_RANGE : ut.Math.Range = new ut.Math.Range(-3, 14);
	const GAME_OVER_DELAY : number = 3;
	const SCREEN_SIZE : Vector2 = new Vector2(84, 48);
	const SCORE_KEY : string = "AbductTopScore";

	@ut.executeBefore(ut.Shared.UserCodeStart)
	export class GameManagerSystem extends ut.ComponentSystem {
		OnUpdate():void {
			let context = this.world.getConfigData(GameContext);
			context.time += this.scheduler.deltaTime();
			if(!context.initialized){
				if(GameManagerSystem.IsTitle(this.world)){
					if(0.5 < context.time && GameManagerSystem.HasAnyInputDown())
						this.LoadGame();
					this.world.setConfigData(context);
					return;
				}
				context = this.Initialize(context);
			}
			this.UpdateZones(context);
			if(context.nextBulletTime <= context.time)
				context = this.SpawnBullet(context);
			while(ANIMAL_LIMIT > context.animalCount)
				context = this.SpawnAnimal(context);
			if(context.ended){
				if(context.gameOverShowTime == 0){
					context.gameOverShowTime = GAME_OVER_DELAY + context.time;
				}else if(context.gameOverShowTime < context.time){
					if(context.gameOverShowTime + 0.5 < context.time && GameManagerSystem.HasAnyInputDown()){
						this.LoadTitle();
						return;
					}
				}
			} 
			this.world.setConfigData(context);
		}

		Initialize(context : GameContext) : GameContext {
			context.scenery = this.SetupScenery();
			context.audioManager = this.SetupAudioManager();
			context.player = this.SetupPlayer();
			context.initialized = true;
			context.gameOverShowTime = 0;
			context.ended = false;
			context.usedLevelInfoArray = this.GenerateUsedLevelInfoArray(
				this.world.getComponentData(context.scenery, Scenery).levelInfoArray
			);
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
			this.world.forEach( [ut.Entity, Scenery],(entity, sceneryComponent)=>{
				const spawnXDistanceToPlayer = SCREEN_SIZE.x/2+2;
				sceneryComponent.bulletSpawnArea = new ut.Math.Rect(
					-spawnXDistanceToPlayer,
					Y_MOVEMENT_RANGE.start - BULLET_EXTRA_Y,
					spawnXDistanceToPlayer*2,
					Y_MOVEMENT_RANGE.end - Y_MOVEMENT_RANGE.start + BULLET_EXTRA_Y*2,
				);
				ret = new ut.Entity(entity.index, entity.version);
			});
			return ret;
		}

		SetupAudioManager() : ut.Entity {
			let ret = null;
			this.world.forEach( [ut.Entity, AudioManager],(entity, audioManagerComponent)=>{
				audioManagerComponent.lastPlayedAudio = new ut.Entity(0,0);
				ret = new ut.Entity(entity.index, entity.version);
			});
			return ret;
		}
		
		SetupPlayer() : ut.Entity {
			let ret = null;
			this.world.forEach( [ut.Entity, Player],(entity, playerComponent)=>{
				ret = new ut.Entity(entity.index, entity.version);
			});
			return ret;
		}

		//TODO move with priority
		// #region Zone
		UpdateZones(context : GameContext) : void{
			const playerPos = this.world.getComponentData(context.player, ut.Core2D.TransformLocalPosition).position;
			let sceneryComponent = this.world.getComponentData(context.scenery, Scenery);
			this.world.forEach([ut.Entity, Zone, ut.Core2D.TransformLocalPosition],(entity, zoneComponent, tLocalPos)=>{
				if(GameManagerSystem.OnZone(tLocalPos.position.x, playerPos.x)){
					if(
						sceneryComponent.currentZone.index != entity.index || 
						sceneryComponent.currentZone.version != entity.version
					){
						sceneryComponent.currentZone = new ut.Entity(entity.index, entity.version);
						sceneryComponent = this.RefreshCornerZone(sceneryComponent, playerPos.x);
					}
				}
			});
			const currentZonePos = this.world.getComponentData(
				sceneryComponent.currentZone, ut.Core2D.TransformLocalPosition
			).position;
			if(
				sceneryComponent.leftCornerZone.index == sceneryComponent.currentZone.index && 
				sceneryComponent.leftCornerZone.version == sceneryComponent.currentZone.version && 
				currentZonePos.x - ZONE_WIDTH/2 + ZONE_BORDER_TO_MOVE>playerPos.x
			){
				this.MoveZone(sceneryComponent.rightCornerZone, currentZonePos.x);
				sceneryComponent = this.RefreshCornerZone(sceneryComponent, playerPos.x);
			}else if(
				sceneryComponent.rightCornerZone.index == sceneryComponent.currentZone.index && 
				sceneryComponent.rightCornerZone.version == sceneryComponent.currentZone.version && 
				currentZonePos.x + ZONE_WIDTH/2 - ZONE_BORDER_TO_MOVE<playerPos.x
			){
				this.MoveZone(sceneryComponent.leftCornerZone, currentZonePos.x);
				sceneryComponent = this.RefreshCornerZone(sceneryComponent, playerPos.x);
			}
			this.world.setComponentData(
				new ut.Entity(context.scenery.index, context.scenery.version), sceneryComponent
			);
		}

		RefreshCornerZone(sceneryComponent : Scenery, playerX:number) : Scenery{
			sceneryComponent.leftCornerZone = new ut.Entity(0,0);
			let mostLeftPos = new Vector3(0,0,0);
			sceneryComponent.rightCornerZone = new ut.Entity(0,0);
			let mostRightPos = new Vector3(0,0,0);
			this.world.forEach([ut.Entity, Zone, ut.Core2D.TransformLocalPosition],(entity, zoneComponent, tLocalPos)=>{
				if(
					sceneryComponent.currentZone.index != entity.index || 
					sceneryComponent.currentZone.version != entity.version
				){
					if(
						tLocalPos.position.x > playerX && 
						(sceneryComponent.rightCornerZone.isNone() || tLocalPos.position.x > mostRightPos.x)
					){
						sceneryComponent.rightCornerZone = new ut.Entity(entity.index, entity.version);
						mostRightPos = tLocalPos.position;
					}
					if(
						tLocalPos.position.x < playerX && 
						(sceneryComponent.leftCornerZone.isNone() || tLocalPos.position.x < mostLeftPos.x)
					){
						sceneryComponent.leftCornerZone = new ut.Entity(entity.index, entity.version);
						mostLeftPos = tLocalPos.position;
					}
				}
			});
			if(sceneryComponent.rightCornerZone.isNone())
				sceneryComponent.rightCornerZone = sceneryComponent.currentZone;
			if(sceneryComponent.leftCornerZone.isNone())
				sceneryComponent.leftCornerZone = sceneryComponent.currentZone;
			return sceneryComponent;
		}

		MoveZone(zone:ut.Entity, currentZoneX:number) : void {
			this.world.usingComponentData(zone, [ut.Core2D.TransformLocalPosition], (tLocalPos) => {
				const vecToAdd = new Vector3(
					(
						Math.abs(currentZoneX - tLocalPos.position.x) + ZONE_WIDTH
					) * reusable.GameUtil.Sign(currentZoneX - tLocalPos.position.x), 
				0, 0);
				/* //remove . Added on AnimalSystem
				console.log("Moved on time="+this.world.getConfigData(GameContext).time);
				console.log("Player pos=");
				console.log(this.world.getComponentData(this.world.getConfigData(GameContext).player, ut.Core2D.TransformLocalPosition).position);
				this.world.forEach([Animal, ut.Core2D.TransformLocalPosition],(animalComponent, animalLocalPos)=>{
					if(GameManagerSystem.OnZone(tLocalPos.position.x, animalLocalPos.position.x)){
						animalLocalPos.position = animalLocalPos.position.add(vecToAdd);
						console.log("animalLocalNewPos");
						console.log(animalLocalPos.position);
					}
				});
				*/
				tLocalPos.position = tLocalPos.position.add(vecToAdd);
			});
		}

		static OnZone(zoneX:number, x:number) : boolean{
			return (zoneX - ZONE_WIDTH/2 <= x) && (x <= zoneX + ZONE_WIDTH/2);
		}
		// #endregion

		//TODO move
		static IsTitle(world:ut.World) : boolean {
			let ret = true;
			world.forEach( [Scenery],(sceneryComponent) => ret = false);
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
					ret[score].speed = (
						levelInfoArray[i].speed + scoreRatio*(levelInfoArray[i+1].speed-levelInfoArray[i].speed)
					);
				}
			}
			return ret;
		}

		SpawnBullet(context : GameContext){
			let sceneryComponent  = this.world.getComponentData(context.scenery, Scenery);
			let bulletSpawnArea  = sceneryComponent.bulletSpawnArea;
			let bullet = ut.EntityGroup.instantiate(this.world, 'game.Bullet')[0];
			this.world.usingComponentData(
				bullet, 
				[ut.Core2D.TransformLocalPosition, ut.Physics2D.Velocity2D], 
				(tLocalPos, velocity)=>{
					const playerPos = this.world.getComponentData(
						context.player, ut.Core2D.TransformLocalPosition
					).position;
					let xSign = this.GetBulletXSign();
					tLocalPos.position = playerPos.add(new Vector3(
						xSign*bulletSpawnArea.x,
						reusable.RandomUtil.Range(bulletSpawnArea.y, reusable.RectUtil.Max(bulletSpawnArea).y),
						0
					));
					let setVelocity = new ut.Physics2D.SetVelocity2D();
					setVelocity.velocity = this.GetBulletVelocity(
						context, sceneryComponent, tLocalPos.position.y, xSign
					);
					this.world.addComponentData(bullet, setVelocity);
				}
			);
			context.nextBulletTime = (
				context.time + reusable.RandomUtil.Range(BULLET_BASE_RESPAWN_TIME_RANGE)/context.speed
			);
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
			ret.y = reusable.RandomUtil.Range(Y_MOVEMENT_RANGE) - localBulletPosY;
			if(localBulletPosY < Y_MOVEMENT_RANGE.start)
				ret.y += Y_MOVEMENT_RANGE.start - localBulletPosY;
			if(localBulletPosY > Y_MOVEMENT_RANGE.end)
				ret.y += Y_MOVEMENT_RANGE.end - localBulletPosY;
			ret.normalize();
			ret.multiplyScalar(context.speed * BULLET_BASE_SPEED);
			return ret;
		}

		SpawnAnimal(context : GameContext){
			let sceneryComponent  = this.world.getComponentData(context.scenery, Scenery);
			let animal = ut.EntityGroup.instantiate(
				this.world, reusable.RandomUtil.SampleArray(context.animalGroupNameArray)
			)[0];
			const maxDistanceFromPlayer = SCREEN_SIZE.x/2+2;
			this.world.usingComponentData(
				animal, 
				[ut.Core2D.TransformLocalPosition, ut.Core2D.TransformLocalRotation], 
				(tLocalPosition, tLocalRotation)=>{
					const playerPos = this.world.getComponentData(
						context.player, ut.Core2D.TransformLocalPosition
					).position;
					const sceneryXRange = GameManagerSystem.GetSceneryXRange(this.world, sceneryComponent);
					do{
						var randomPosX = reusable.RandomUtil.Range(sceneryXRange);
						//TODO maybe a Math.floor
					}while(context.time > 1 && Math.abs(playerPos.x-randomPosX) < maxDistanceFromPlayer)
					tLocalPosition.position = new Vector3(randomPosX,GameManagerSystem.GetGroundPosY(),0);
					if(Math.random() > 0.5)
						tLocalRotation.rotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
				}
			);
			context.animalCount++;
			return context;
		}

		static GetSceneryXRange(world: ut.World, sceneryComponent:Scenery): ut.Math.Range{
			/* //remove 
			if(sceneryComponent.leftCornerZone.isNone())
				var leftCornerZone =  sceneryComponent.currentZone;
			else
				var leftCornerZone =  sceneryComponent.leftCornerZone;
			if(sceneryComponent.rightCornerZone.isNone())
				var rightCornerZone =  sceneryComponent.currentZone;
			else
				var rightCornerZone =  sceneryComponent.rightCornerZone;
			*/
			return new ut.Math.Range(
				world.getComponentData(
					sceneryComponent.leftCornerZone, ut.Core2D.TransformLocalPosition
				).position.x - ZONE_WIDTH/2,
				world.getComponentData(
					sceneryComponent.rightCornerZone, ut.Core2D.TransformLocalPosition
				).position.x + ZONE_WIDTH/2,
			);
		}

		LoadGame() : void{
			ut.EntityGroup.destroyAll(this.world, 'game.Title');
			ut.EntityGroup.instantiate(this.world, 'game.Game');
		}

		LoadTitle(): void {
			let context = this.world.getConfigData(GameContext);
			context.initialized = false;
			context.time = 0;
			this.world.setConfigData(context);
			ut.EntityGroup.destroyAll(this.world, 'game.Game');
			ut.EntityGroup.destroyAll(this.world, 'game.Bullet');
			for(const animalEntityName of context.animalGroupNameArray)
				ut.EntityGroup.destroyAll(this.world, animalEntityName);
			ut.EntityGroup.instantiate(this.world, 'game.Title');
		}

		//TODO move
		static AddOnePoint(world: ut.World) : void {
			let context = world.getConfigData(GameContext);
			context.score+=1;
			if(context.score >= context.usedLevelInfoArray.length)
				context.speed = context.usedLevelInfoArray[context.usedLevelInfoArray.length - 1].speed;
			else
				context.speed = context.usedLevelInfoArray[context.score].speed;
		   world.setConfigData(context);
		}

		//TODO global constants class
		static GetGroundPosY() : number{
			return GROUND_POS_Y;
		}

		//TODO global constants class
		static GetYMovementRange() : ut.Math.Range{
			return Y_MOVEMENT_RANGE;
		}

		//TODO move
		static HasAnyInputDown() : boolean {
			return ut.Runtime.Input.getMouseButton(0) || reusable.GameUtil.GetKeyDown([
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
			return +reusable.PersistenceUtil.getCookie(SCORE_KEY);
		}

		static SaveTopScore(value:number) : void{
			reusable.PersistenceUtil.setCookie(SCORE_KEY, value.toString());
		}

		static GetTimeFormatted(context : GameContext): string{
			return Math.floor(context.time/60)+":"+reusable.GameUtil.ExactDigits( Math.floor(context.time) % 60 ,2)
		}
	}
}