/// <reference path="PlayerSystem.ts" />

namespace game {
	const MAX_DISTANCE_TO_RUN_FROM_TRACTOR_BEAM : number = 9;

	@ut.requiredComponents(Animal)
	@ut.executeAfter(ut.Shared.UserCodeStart)
	@ut.executeAfter(game.PlayerSystem)
	export class AnimalSystem extends ut.ComponentSystem {

		//TODO break in methods
		OnUpdate():void {
			const context = this.world.getConfigData(GameContext);
			if(context.state == GameState.BeforeStart)
				return;
			const scenery = this.world.getComponentData(context.scenery, Scenery);
			const sceneryXRange = GameManagerSystem.GetSceneryXRange(this.world, scenery)
			this.world.forEach(
				[ut.Entity, Animal, ut.Core2D.TransformLocalPosition, ut.Core2D.TransformLocalRotation], 
				(entity, animal, tLocalPos, tLocalRot) => {
					if(animal.onTractorBeam){
						tLocalPos.position = tLocalPos.position.add(new Vector3(0, animal.abductSpeed*this.scheduler.deltaTime(), 0));
						return;
					}
					tLocalPos.position = this.GetClampedPosOnScenery(tLocalPos.position, sceneryXRange); 

					if(animal.nextMoveTime != 0){
						if(animal.nextMoveTime > context.time)
							return;
						if(Math.random() <= animal.turnRatio)
							tLocalRot = this.Rotate(tLocalRot);
						animal.nextMoveTime = 0;
					}
						
					if(animal.nextPauseTryTime == 0)
						animal.nextPauseTryTime = animal.pauseTryTime+context.time;
					if(context.time > animal.nextPauseTryTime){
						if(Math.random() <= animal.pauseRatio)
							animal.nextMoveTime = reusable.RandomUtil.Range(animal.basePauseDurationRange) + context.time;
						animal.nextPauseTryTime = 0;
					}else{
						if(this.ShouldRunFromTractorBeam(tLocalPos.position, tLocalRot.rotation))
							tLocalRot = this.Rotate(tLocalRot);
						tLocalPos.position = this.GetNewPosAfterFrame(animal, tLocalPos, tLocalRot);
						if(tLocalPos.position.y == GameConstants.GROUND_POS_Y && animal.jumpHeight>0)
							this.CreateJumpTween(entity, animal, tLocalPos.position);
					}
				}
			);
		}

		GetClampedPosOnScenery(pos:Vector3, sceneryXRange:ut.Math.Range) : Vector3{
			if(sceneryXRange.start>pos.x)
				pos.x+=sceneryXRange.end-sceneryXRange.start;
			if(sceneryXRange.end<pos.x)
				pos.x-=sceneryXRange.end-sceneryXRange.start;
			return pos;
		}

		ShouldRunFromTractorBeam(pos:Vector3, rot:Quaternion) : Boolean{
			const context = this.world.getConfigData(GameContext); 
			const player = this.world.getComponentData(context.player, Player);
			if(!PlayerSystem.IsTractorBeamActive(this.world, player))
				return false;
			const playerPosX = this.world.getComponentData(context.player, ut.Core2D.TransformLocalPosition).position.x;
			if(Math.abs(playerPosX - pos.x) > MAX_DISTANCE_TO_RUN_FROM_TRACTOR_BEAM)
				return false;
			return new Quaternion(0,0,0,1).equals(rot) == (playerPosX - pos.x > 0);
		}

		Rotate(tLocalRot:ut.Core2D.TransformLocalRotation) : ut.Core2D.TransformLocalRotation{
			tLocalRot.rotation = new Quaternion().setFromAxisAngle(
				new Vector3(0, 1, 0), new Quaternion(0,0,0,1).equals(tLocalRot.rotation) ? Math.PI : 0
			);
			return tLocalRot;
		}

		GetNewPosAfterFrame(animal:Animal,tLocalPos:ut.Core2D.TransformLocalPosition,tLocalRot:ut.Core2D.TransformLocalRotation) : Vector3{
			const sign = new Euler().setFromQuaternion(tLocalRot.rotation).y==0 ? 1 : -1;
			return tLocalPos.position.add(new Vector3(sign*animal.speed * this.scheduler.deltaTime(), 0, 0));
		}

		CreateJumpTween(entity:ut.Entity, animal:Animal, pos:Vector3) : void{
			ut.Tweens.TweenService.addTween(
				this.world, 
				entity,
				ut.Core2D.TransformLocalPosition.position.y,
				pos.y,
				pos.y + animal.jumpHeight,
				animal.jumpHeight/animal.jumpSpeed,
				0,
				ut.Core2D.LoopMode.PingPongOnce, 
				ut.Tweens.TweenFunc.OutQuad,
				true
			);
		}
	}
}