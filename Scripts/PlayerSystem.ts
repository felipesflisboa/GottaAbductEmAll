
namespace game {
	const SPEED : number = 35;
	const RESPAWN_DURATION : number = 1.2;
	const RESPAWN_INVINCIBILITY_DURATION : number = 2.4;
	const EXTRA_LIVE_POINTS : number = 15; 

	@ut.executeAfter(ut.Shared.UserCodeStart)
	export class PlayerSystem extends ut.ComponentSystem {
		OnUpdate():void {
			let context = this.world.getConfigData(GameContext);
			if(context.state == GameState.BeforeStart || context.paused)
				return;
			this.UpdateBulletCollision();
			this.world.forEach([ut.Entity, Player, ut.Core2D.TransformLocalPosition],(entity, player, tLocalPos) => {
				if(player.state != PlayerState.Alive && player.endStateTime>0 && player.endStateTime<context.time){
					console.log("player.endStateTime="+player.endStateTime+" context.time="+context.time);
					switch (player.state) {
					case PlayerState.Invincible:
						player = this.RemoveInvincibility(player);
						break;
					case PlayerState.Dead:
						player = this.Resurrect(player);
						break;
					}
				}

				if(context.time < 0.1){
					if(AbductUtil.IsTractorBeamActive(this.world, player))
						reusable.EntityUtil.ToggleActiveRecursively(this.world, player.tractorBeam);
				}else{
					if(
						(player.state != PlayerState.Dead && this.IsTractorBeamInputActive()) ||
						(player.state == PlayerState.Dead && AbductUtil.IsTractorBeamActive(this.world, player))
					){
						reusable.EntityUtil.ToggleActiveRecursively(this.world, player.tractorBeam);
					}
				}

				player = this.UpdateTractorBeamAnimals(entity, player);  

				if(player.state == PlayerState.Dead){
					this.world.usingComponentData(
						player.explosionGraphic, 
						[ut.Core2D.Sprite2DRenderer, ut.Core2D.Sprite2DSequencePlayer], 
						(spriteRenderer, sequencePlayer)=>{
							if(sequencePlayer.time > 0.6){
								sequencePlayer.paused = true;
								spriteRenderer.color = new ut.Core2D.Color(spriteRenderer.color.r, spriteRenderer.color.g, spriteRenderer.color.b, 0); 
							}
						}
					);
					return;
				}

				let playerCurrentSpeed = SPEED;
				if(AbductUtil.IsTractorBeamActive(this.world, player))
					playerCurrentSpeed/=2;
				tLocalPos.position = reusable.VectorUtil.V2To3(reusable.VectorUtil.V3To2(tLocalPos.position).add(this.GetMovementInput(
					this.world.getComponentData(context.inputer, Inputer)
				).multiplyScalar(this.scheduler.deltaTime()*playerCurrentSpeed)));
				
				tLocalPos.position = this.GetClampedPlayerPos(tLocalPos.position);
				this.FollowPlayer(entity, player.camera);
			});
		}

		GetClampedPlayerPos(pos:Vector3) : Vector3{
			return new Vector3(
				pos.x,
				Math.min(GameConstants.Y_MOVEMENT_RANGE.end,Math.max(GameConstants.Y_MOVEMENT_RANGE.start, pos.y)),
				pos.z
			);
		}

		FollowPlayer(playerEntity:ut.Entity, cameraEntity:ut.Entity) : void{
			this.world.usingComponentData(cameraEntity, [ut.Core2D.TransformLocalPosition], (cameraTLocalPos)=>{
				cameraTLocalPos.position.x = ut.Core2D.TransformService.localPositionFromWorldPosition(
					this.world,cameraEntity,ut.Core2D.TransformService.computeWorldPosition (this.world, playerEntity)
				).x;
			});
		}

		UpdateBulletCollision() : void{
			this.world.forEach([Player, ut.HitBox2D.HitBoxOverlapResults],(player, overlap) => {
				if(player.state != PlayerState.Alive)
					return;
				for (let o of overlap.overlaps) {
					if (!this.world.hasComponent(o.otherEntity, Bullet))
						continue;   
					this.world.usingComponentData(o.otherEntity, [ut.Core2D.TransformLocalPosition], (tLocalPos)=>{
						// Or this mess when iterating on UpdateTractorBeamAnimals. This automatically will be destroyed for being out of range
						tLocalPos.position = tLocalPos.position.add(new Vector3(2000, 0, 0));
					});
					player = this.Explode(player);
					break;
				};
			});
		}

		UpdateTractorBeamAnimals(playerEntity:ut.Entity, player:Player) : Player{
			if(this.world.hasComponent(playerEntity, ut.HitBox2D.HitBoxOverlapResults)){
				for (let o of this.world.getComponentData(playerEntity, ut.HitBox2D.HitBoxOverlapResults).overlaps) {
					if (o.otherEntity.isNone() || !this.world.hasComponent(o.otherEntity, Animal))
						continue;
					player = this.AddPoints(player, this.world.getComponentData(o.otherEntity, Animal).points);
					reusable.EntityUtil.SetActiveRecursively(this.world, o.otherEntity, false);  
					let context = this.world.getConfigData(GameContext);
					context.animalCount--;
					this.world.setConfigData(context);
				}
			}
			let newAnimalOnTractorBeamArray = new Array<ut.Entity>();
			if(
				!this.world.hasComponent(player.tractorBeam, ut.Disabled) && 
				this.world.hasComponent(player.tractorBeam, ut.HitBox2D.HitBoxOverlapResults)
			){
				let overlap = this.world.getComponentData(player.tractorBeam, ut.HitBox2D.HitBoxOverlapResults);
				for (let o of overlap.overlaps) {
					if (!this.world.exists(o.otherEntity) || !this.world.hasComponent(o.otherEntity, Animal))
						continue;
					let index = reusable.GeneralUtil.IndexOfEntity(player.animalOnTractorBeamArray, o.otherEntity);
					if(index == -1){
						ut.Tweens.TweenService.removeAllTweens(this.world, o.otherEntity);
						this.world.usingComponentData(
							o.otherEntity, [Animal, ut.Core2D.TransformLocalPosition], (animal, tLocalPos) => {
								animal.onTractorBeam = true;
								tLocalPos.position = new Vector3(tLocalPos.position.x, GameConstants.GROUND_POS_Y, tLocalPos.position.z);
							}
						);
					}else{
						let animalOnTractorBeamArray = player.animalOnTractorBeamArray;
						animalOnTractorBeamArray.splice(index, 1);
						player.animalOnTractorBeamArray = animalOnTractorBeamArray;
					}
					newAnimalOnTractorBeamArray.push(o.otherEntity);
				};
			}
			for (let animal of player.animalOnTractorBeamArray) {
				this.world.usingComponentData(animal, [Animal, ut.Core2D.TransformLocalPosition], (animal, tLocalPos) => {
					animal.onTractorBeam = false;
					tLocalPos.position = new Vector3(tLocalPos.position.x, GameConstants.GROUND_POS_Y, tLocalPos.position.z);
				});
			};
			player.animalOnTractorBeamArray = newAnimalOnTractorBeamArray;
			return player;
		}

		AddPoints(player:Player, points:number) : Player{
			AbductUtil.AddPoints(this.world, points);
			AudioPlayer.Play(this.world,this.world.getComponentData(
				this.world.getConfigData(GameContext).audioManager, AudioManager
			).pointAudio);
			if(player.extraLiveRemainingPoints!=0){
				player.extraLiveRemainingPoints-=points;
				if(player.extraLiveRemainingPoints<=0 && player.extraLiveCount < GameConstants.PLAYER_EXTRA_LIVE_LIMIT){
					AudioPlayer.Play(this.world,this.world.getComponentData(
						this.world.getConfigData(GameContext).audioManager, AudioManager
					).liveAudio);
					player.extraLiveCount++;
					if(player.extraLiveCount < GameConstants.PLAYER_EXTRA_LIVE_LIMIT)
						player.extraLiveRemainingPoints+=EXTRA_LIVE_POINTS;
					else
						player.extraLiveRemainingPoints = 0;
				}
			}
			return player;
		}

		Explode(player:Player) : Player{
			let context = this.world.getConfigData(GameContext);
			player.state = PlayerState.Dead;
			player.extraLiveCount-=1;
			if(player.extraLiveRemainingPoints==0)
				player.extraLiveRemainingPoints=EXTRA_LIVE_POINTS;
			if(player.extraLiveCount >= 0){
				player.endStateTime = RESPAWN_DURATION + this.world.getConfigData(GameContext).time;
			}else{
				player.endStateTime = 0;
				this.GameOver();
			}
			this.world.addComponent(player.graphic, ut.Disabled);
			this.world.usingComponentData(player.explosionGraphic, [ut.Core2D.Sprite2DRenderer, ut.Core2D.Sprite2DSequencePlayer], 
				(spriteRenderer, sequencePlayer)=>{
					sequencePlayer.time = 0;
					sequencePlayer.paused = false;
					spriteRenderer.color = new ut.Core2D.Color(spriteRenderer.color.r, spriteRenderer.color.g, spriteRenderer.color.b, 1); 
				}
			);
			AudioPlayer.Play(this.world,this.world.getComponentData(context.audioManager, AudioManager).deathAudio);
			return player;
		}

		GameOver() : void {
			let context = this.world.getConfigData(GameContext);
			context.state = GameState.Ended;
			console.log("Duration "+AbductUtil.GetTimeFormatted(context));
			if(context.score > context.topScore)
				AbductUtil.SaveTopScore(context.score);
			this.world.setConfigData(context);
		}

		Resurrect(player:Player) : Player{
			player.state = PlayerState.Invincible;
			player.endStateTime = RESPAWN_INVINCIBILITY_DURATION + this.world.getConfigData(GameContext).time;
			this.world.usingComponentData( 
				player.explosionGraphic, 
				[ut.Core2D.Sprite2DRenderer, ut.Core2D.Sprite2DSequencePlayer], 
				(spriteRenderer, sequencePlayer)=>{
					// Safe apply
					sequencePlayer.paused = true;
					spriteRenderer.color = new ut.Core2D.Color(spriteRenderer.color.r, spriteRenderer.color.g, spriteRenderer.color.b, 0);
				}
			);
			this.world.removeComponent(player.graphic, ut.Disabled);
			this.world.usingComponentData(player.graphic, [game.SpriteFlasher], (spriteFlasher) => spriteFlasher.enabled = true);
			return player;
		}

		RemoveInvincibility(player:Player) : Player{
			player.state = PlayerState.Alive;
			this.world.usingComponentData(player.graphic, [game.SpriteFlasher], (spriteFlasher) => spriteFlasher.enabled = false);
			return player;
		}

		//TODO maybe break
		GetMovementInput(inputer:Inputer) : Vector2 {
			let ret = new Vector2();
			if(inputer.activeInputArray[InputCommand.Left])
				ret.x += -1;
			if(inputer.activeInputArray[InputCommand.Right])
				ret.x += 1;
			if(inputer.activeInputArray[InputCommand.Down])
				ret.y += -1;
			if(inputer.activeInputArray[InputCommand.Up])
				ret.y += 1;
			return ret;
		}

		IsTractorBeamInputActive() : boolean {
			return this.world.getComponentData(this.world.getConfigData(GameContext).inputer, Inputer).activeInputArray[InputCommand.Action];
		}
	}
}
