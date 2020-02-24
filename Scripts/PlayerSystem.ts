
namespace game {
	const SPEED : number = 35;
	const RESPAWN_DURATION : number = 1.2;
	const RESPAWN_INVINCIBILITY_DURATION : number = 2.4;
	const EXTRA_LIVE_POINTS : number = 20; 

	@ut.requiredComponents(Player)
	@ut.executeAfter(ut.Shared.UserCodeStart)
	export class PlayerSystem extends ut.ComponentSystem {
		OnUpdate():void {
			let context = this.world.getConfigData(GameContext);
			if(context.state == GameState.BeforeStart)
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
				if(this.IsTractorBeamActive(player) != (this.IsTractorBeamInputActive() && player.state != PlayerState.Dead))
					reusable.GeneralUtil.ToggleActiveRecursively(this.world, player.tractorBeam);   
				player = this.UpdateTractorBeamAnimals(entity, player);  

				if(player.state == PlayerState.Dead){
					this.world.usingComponentData(
						player.explosionGraphic, 
						[ut.Core2D.Sprite2DRenderer, ut.Core2D.Sprite2DSequencePlayer], 
						(spriteRenderer, sequencePlayer)=>{
							if(sequencePlayer.time > 0.4){
								sequencePlayer.paused = true;
								spriteRenderer.color = new ut.Core2D.Color(spriteRenderer.color.r, spriteRenderer.color.g, spriteRenderer.color.b, 0); 
							}
						}
					);
					return;
				}

				let playerCurrentSpeed = SPEED;
				if(this.IsTractorBeamActive(player))
					playerCurrentSpeed/=2;
				tLocalPos.position = reusable.VectorUtil.V2To3(reusable.VectorUtil.V3To2(tLocalPos.position).add(
					this.GetMovementInput().multiplyScalar(this.scheduler.deltaTime()*playerCurrentSpeed)
				));
				//TODO break on method
				tLocalPos.position = new Vector3(tLocalPos.position.x, Math.min(
					GameConstants.Y_MOVEMENT_RANGE.end,
					Math.max(GameConstants.Y_MOVEMENT_RANGE.start, tLocalPos.position.y)
				),tLocalPos.position.z);

				//TODO maybe method
				this.world.usingComponentData(player.camera, [ut.Core2D.TransformLocalPosition], (cameraTLocalPos)=>{
					cameraTLocalPos.position.x = ut.Core2D.TransformService.localPositionFromWorldPosition(
						this.world, player.camera,ut.Core2D.TransformService.computeWorldPosition (this.world, entity)
					).x;
				});
			});
		}

		UpdateBulletCollision() : void{
			this.world.forEach([ut.Entity, Player, ut.HitBox2D.HitBoxOverlapResults],(entity, player, overlap) => {
				if(player.state != PlayerState.Alive)
					return;
				for (let o of overlap.overlaps) {
					if (!this.world.hasComponent(o.otherEntity, Bullet))
						continue;   
					ut.Core2D.TransformService.destroyTree(this.world, o.otherEntity, true);
					player = this.Explode(player);
					break;
				};
			});
		}

		UpdateTractorBeamAnimals(playerEntity:ut.Entity, player:Player) : Player{
			if(this.world.hasComponent(playerEntity, ut.HitBox2D.HitBoxOverlapResults)){
				for (let o of this.world.getComponentData(playerEntity, ut.HitBox2D.HitBoxOverlapResults).overlaps) {
					if (!this.world.hasComponent(o.otherEntity, Animal))
						continue;
					player = this.AddPoints(player, this.world.getComponentData(o.otherEntity, Animal).points);
					reusable.GeneralUtil.SetActiveRecursively(this.world, o.otherEntity, false);  
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
			GameManagerSystem.AddPoints(this.world, points);
			AudioPlayer.Play(this.world,this.world.getComponentData(
				this.world.getConfigData(GameContext).audioManager, AudioManager
			).pointAudio);
			if(player.extraLiveRequiredPoints!=0){
				player.extraLiveRequiredPoints-=points;
				if(player.extraLiveRequiredPoints<=0 && player.extraLiveCount < GameConstants.PLAYER_EXTRA_LIVE_LIMIT){
					AudioPlayer.Play(this.world,this.world.getComponentData(
						this.world.getConfigData(GameContext).audioManager, AudioManager
					).liveAudio);
					player.extraLiveCount++;
					if(player.extraLiveCount < GameConstants.PLAYER_EXTRA_LIVE_LIMIT)
						player.extraLiveRequiredPoints+=EXTRA_LIVE_POINTS;
					else
						player.extraLiveRequiredPoints = 0
				}
			}
			return player;
		}

		Explode(player:Player) : Player{
			let context = this.world.getConfigData(GameContext);
			player.state = PlayerState.Dead;
			player.extraLiveCount-=1;
			if(player.extraLiveRequiredPoints==0)
				player.extraLiveRequiredPoints=EXTRA_LIVE_POINTS;
			if(player.extraLiveCount >= 0){
				player.endStateTime = RESPAWN_DURATION + this.world.getConfigData(GameContext).time;
			}else{
				//TODO move
				player.endStateTime = 0;
				context.state = GameState.Ended;
				console.log("Duration "+GameManagerSystem.GetTimeFormatted(context));
				if(context.score > context.topScore)
					GameManagerSystem.SaveTopScore(context.score);
				this.world.setConfigData(context);
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

		IsTractorBeamActive(player:Player) : boolean {
			return !this.world.hasComponent(player.tractorBeam, ut.Disabled);
		}

		//TODO maybe break
		GetMovementInput() : Vector2 {
			let ret = new Vector2();
			if(reusable.GeneralUtil.GetKey([
				ut.Core2D.KeyCode.A, ut.Core2D.KeyCode.LeftArrow, ut.Core2D.KeyCode.Keypad4
			])){
				ret.x += -1;
			}
			if(reusable.GeneralUtil.GetKey([
				ut.Core2D.KeyCode.D, ut.Core2D.KeyCode.RightArrow, ut.Core2D.KeyCode.Keypad6
			])){
				ret.x += 1;
			}
			if(reusable.GeneralUtil.GetKey([
				ut.Core2D.KeyCode.S, ut.Core2D.KeyCode.DownArrow, ut.Core2D.KeyCode.Keypad2, ut.Core2D.KeyCode.Keypad5
			])){
				ret.y += -1;
			}
			if(reusable.GeneralUtil.GetKey([
				ut.Core2D.KeyCode.W, ut.Core2D.KeyCode.UpArrow, ut.Core2D.KeyCode.Keypad8
			])){
				ret.y += 1;
			}
			return ret;
		}

		IsTractorBeamInputActive() : boolean {
			return ut.Runtime.Input.getMouseButton(0) || reusable.GeneralUtil.GetKey([
				ut.Core2D.KeyCode.Space, 
				ut.Core2D.KeyCode.LeftControl, 
				ut.Core2D.KeyCode.RightControl,
				ut.Core2D.KeyCode.Keypad1,
				ut.Core2D.KeyCode.Keypad3,
				ut.Core2D.KeyCode.Keypad7,
				ut.Core2D.KeyCode.Keypad9
			]);
		}
	}
}
