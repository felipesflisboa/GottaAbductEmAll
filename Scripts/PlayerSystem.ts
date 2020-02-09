
namespace game {
    const BASE_SPEED : number = 35;
    const RESPAWN_DURATION : number = 1.2;
    const RESPAWN_INVINCIBILITY_DURATION : number = 2.4;
    const EXTRA_LIVE_POINTS : number = 10; 

    @ut.requiredComponents(Player)
    @ut.executeAfter(ut.Shared.UserCodeStart)
    export class PlayerSystem extends ut.ComponentSystem {
        OnUpdate():void {
            let context = this.world.getConfigData(GameContext);
            if(!context.initialized)
                return;
            let sceneryComponent = this.world.getComponentData(context.scenery, Scenery);
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
                if(
                    this.IsTractorBeamActive(player) != 
                    (this.IsTractorBeamInputActive() && player.state != PlayerState.Dead)
                ){
                    reusable.GameUtil.ToggleActiveRecursively(this.world, player.tractorBeam);   
                }
                player = this.UpdateTractorBeamAnimals(entity, player);  

                if(player.state == PlayerState.Dead){
                    /* //remove
                    if(this.world.getComponentData(player.explosionGraphic, ut.Core2D.Sprite2DSequencePlayer).paused){
                        console.log("this.world.hasComponent(player.explosionGraphic, ut.Disabled)");
                        console.log(this.world.hasComponent(player.explosionGraphic, ut.Disabled));
                        console.log("player.explosionGraphic");
                        console.log(player.explosionGraphic);
                        this.world.addComponentData(player.explosionGraphic, ut.Disabled);
                    }
                    */
                    this.world.usingComponentData(
                        player.explosionGraphic, 
                        [ut.Core2D.Sprite2DRenderer, ut.Core2D.Sprite2DSequencePlayer], 
                        (spriteRenderer, sequencePlayer)=>{
                            if(sequencePlayer.time > 0.4){
                                sequencePlayer.paused = true;
                                spriteRenderer.color = new ut.Core2D.Color(
                                    spriteRenderer.color.r, spriteRenderer.color.g, spriteRenderer.color.b, 0
                                ); 
                            }
                        }
                    );
                    return;
                }

                let playerCurrentSpeed = BASE_SPEED*context.speed;
                if(this.IsTractorBeamActive(player))
                    playerCurrentSpeed/=2;
                tLocalPos.position = reusable.VectorUtil.V2To3(reusable.VectorUtil.V3To2(tLocalPos.position).add(
                    this.GetMovementInput().multiplyScalar(this.scheduler.deltaTime()*playerCurrentSpeed)
                ));
                //TODO break on method
                tLocalPos.position = new Vector3(tLocalPos.position.x, Math.min(
                    GameManagerSystem.GetYMovementRange().end,
                    Math.max(GameManagerSystem.GetYMovementRange().start, tLocalPos.position.y)
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
            this.world.forEach([ut.Entity, Player, ut.HitBox2D.HitBoxOverlapResults],(entity,playerComponent,overlap) => {
                if(playerComponent.state != PlayerState.Alive)
                    return;
                for (let o of overlap.overlaps) {
                    if (!this.world.hasComponent(o.otherEntity, Bullet))
                        continue;   
                    ut.Core2D.TransformService.destroyTree(this.world, o.otherEntity, true);
                    playerComponent = this.Explode(playerComponent);
                    break;
                };
            });
        }

        UpdateTractorBeamAnimals(player:ut.Entity, playerComponent:Player) : Player{
            if(this.world.hasComponent(player, ut.HitBox2D.HitBoxOverlapResults)){
                for (let o of this.world.getComponentData(player, ut.HitBox2D.HitBoxOverlapResults).overlaps) {
                    if (!this.world.hasComponent(o.otherEntity, Animal))
                        continue;
                    playerComponent = this.AddOnePoint(playerComponent);
                    reusable.GameUtil.SetActiveRecursively(this.world, o.otherEntity, false);  
                    let context = this.world.getConfigData(GameContext);
                    context.animalCount--;
                    this.world.setConfigData(context);
                }
            }
            let newAnimalOnTractorBeamArray = new Array<ut.Entity>();
            if(
                !this.world.hasComponent(playerComponent.tractorBeam, ut.Disabled) && 
                this.world.hasComponent(playerComponent.tractorBeam, ut.HitBox2D.HitBoxOverlapResults)
            ){
                let overlap = this.world.getComponentData(playerComponent.tractorBeam, ut.HitBox2D.HitBoxOverlapResults);
                for (let o of overlap.overlaps) {
                    if (!this.world.exists(o.otherEntity) || !this.world.hasComponent(o.otherEntity, Animal))
                        continue;
                    let index = reusable.GameUtil.IndexOfEntity(playerComponent.animalOnTractorBeamArray, o.otherEntity);
                    if(index == -1){
                        ut.Tweens.TweenService.removeAllTweens(this.world, o.otherEntity);
                        this.world.usingComponentData(
                            o.otherEntity, [Animal, ut.Core2D.TransformLocalPosition], (animalComponent, tLocalPos) => {
                                animalComponent.onTractorBeam = true;
                                tLocalPos.position = new Vector3(
                                    tLocalPos.position.x, GameManagerSystem.GetGroundPosY(), tLocalPos.position.z
                                );
                            }
                        );
                    }else{
                        let animalOnTractorBeamArray = playerComponent.animalOnTractorBeamArray;
                        animalOnTractorBeamArray.splice(index, 1);
                        playerComponent.animalOnTractorBeamArray = animalOnTractorBeamArray;
                    }
                    newAnimalOnTractorBeamArray.push(o.otherEntity);
                };
            }
            for (let animal of playerComponent.animalOnTractorBeamArray) {
                this.world.usingComponentData(
                    animal, [Animal, ut.Core2D.TransformLocalPosition], (animalComponent, tLocalPos) => {
                        animalComponent.onTractorBeam = false;
                        tLocalPos.position = new Vector3(
                            tLocalPos.position.x, GameManagerSystem.GetGroundPosY(), tLocalPos.position.z
                        );
                    }
                );
            };
            playerComponent.animalOnTractorBeamArray = newAnimalOnTractorBeamArray;
            return playerComponent;
        }

        AddOnePoint(playerComponent:Player) : Player{
            GameManagerSystem.AddOnePoint(this.world);
            AudioPlayer.Play(this.world,this.world.getComponentData(
                this.world.getConfigData(GameContext).audioManager, AudioManager
            ).pointAudio);
            if(playerComponent.extraLiveRequiredPoints!=0){
                playerComponent.extraLiveRequiredPoints-=1;
                if(
                    playerComponent.extraLiveRequiredPoints==0 && 
                    playerComponent.extraLiveCount < playerComponent.extraLiveLimit
                ){
                    AudioPlayer.Play(this.world,this.world.getComponentData(
                        this.world.getConfigData(GameContext).audioManager, AudioManager
                    ).liveAudio);
                    playerComponent.extraLiveCount+=1;
                    if(playerComponent.extraLiveCount < playerComponent.extraLiveLimit){
                        playerComponent.extraLiveRequiredPoints=EXTRA_LIVE_POINTS;
                    }
                }
            }
            return playerComponent;
        }

        Explode(playerComponent:Player) : Player{
            let context = this.world.getConfigData(GameContext);
            playerComponent.state = PlayerState.Dead;
            playerComponent.extraLiveCount-=1;
            if(playerComponent.extraLiveRequiredPoints==0){
                playerComponent.extraLiveRequiredPoints=EXTRA_LIVE_POINTS;
            }
            if(playerComponent.extraLiveCount >= 0){
                playerComponent.endStateTime = RESPAWN_DURATION + this.world.getConfigData(GameContext).time;
            }else{
                //TODO move
                playerComponent.endStateTime = 0;
                context.ended = true;
                console.log("Duration "+GameManagerSystem.GetTimeFormatted(context));
                if(context.score > context.topScore)
                    GameManagerSystem.SaveTopScore(context.score);
                this.world.setConfigData(context);
            }
            this.world.addComponent(playerComponent.graphic, ut.Disabled);
            this.world.usingComponentData(
                playerComponent.explosionGraphic, 
                [ut.Core2D.Sprite2DRenderer, ut.Core2D.Sprite2DSequencePlayer], 
                (spriteRenderer, sequencePlayer)=>{
                    sequencePlayer.time = 0;
                    sequencePlayer.paused = false;
                    spriteRenderer.color = new ut.Core2D.Color(
                        spriteRenderer.color.r, spriteRenderer.color.g, spriteRenderer.color.b, 1
                    ); 
                }
            );
            AudioPlayer.Play(
                this.world,this.world.getComponentData(context.audioManager, AudioManager).deathAudio
            );
            return playerComponent;
        }

        Resurrect(playerComponent:Player) : Player{
            playerComponent.state = PlayerState.Invincible;
            playerComponent.endStateTime = RESPAWN_INVINCIBILITY_DURATION + this.world.getConfigData(GameContext).time;
            this.world.removeComponent(playerComponent.graphic, ut.Disabled);
            this.world.usingComponentData(
                playerComponent.graphic, [game.SpriteFlasher], (spriteFlasher) => spriteFlasher.enabled = true
            );
            return playerComponent;
        }

        RemoveInvincibility(playerComponent:Player) : Player{
            playerComponent.state = PlayerState.Alive;
            this.world.usingComponentData(
                playerComponent.graphic, [game.SpriteFlasher], (spriteFlasher)=> spriteFlasher.enabled = false
            );
            return playerComponent;
        }

        IsTractorBeamActive(playerComponent:Player) : boolean {
            return !this.world.hasComponent(playerComponent.tractorBeam, ut.Disabled);
        }

        //TODO maybe break
        GetMovementInput() : Vector2 {
            let ret = new Vector2();
            if(reusable.GameUtil.GetKey([
                ut.Core2D.KeyCode.A, ut.Core2D.KeyCode.LeftArrow, ut.Core2D.KeyCode.Keypad4
            ])){
                ret.x += -1;
            }
            if(reusable.GameUtil.GetKey([
                ut.Core2D.KeyCode.D, ut.Core2D.KeyCode.RightArrow, ut.Core2D.KeyCode.Keypad6
            ])){
                ret.x += 1;
            }
            if(reusable.GameUtil.GetKey([
                ut.Core2D.KeyCode.S, ut.Core2D.KeyCode.DownArrow, ut.Core2D.KeyCode.Keypad2, ut.Core2D.KeyCode.Keypad5
            ])){
                ret.y += -1;
            }
            if(reusable.GameUtil.GetKey([
                ut.Core2D.KeyCode.W, ut.Core2D.KeyCode.UpArrow, ut.Core2D.KeyCode.Keypad8
            ])){
                ret.y += 1;
            }
            return ret;
        }

        IsTractorBeamInputActive() : boolean {
            return ut.Runtime.Input.getMouseButton(0) || reusable.GameUtil.GetKey([
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
