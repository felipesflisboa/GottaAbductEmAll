/// <reference path="PlayerSystem.ts" />

namespace game {
	@ut.requiredComponents(Animal)
	@ut.executeAfter(ut.Shared.UserCodeStart)
	@ut.executeAfter(game.PlayerSystem)
	export class AnimalSystem extends ut.ComponentSystem {

		//TODO break in methods
		OnUpdate():void {
			let context = this.world.getConfigData(GameContext);
			if(!context.initialized)
				return;
			const sceneryComponent = this.world.getComponentData(context.scenery, Scenery);
			const sceneryXRange = GameManagerSystem.GetSceneryXRange(this.world, sceneryComponent)
			this.world.forEach(
				[ut.Entity, Animal, ut.Core2D.TransformLocalPosition, ut.Core2D.TransformLocalRotation], 
				(entity, animalComponent, tLocalPos, tLocalRot) => {
					if(animalComponent.onTractorBeam){
						tLocalPos.position = tLocalPos.position.add(new Vector3(0, animalComponent.abductSpeed*this.scheduler.deltaTime(), 0));
						return;
					}

					let pos = tLocalPos.position; 
					if(sceneryXRange.start>pos.x)
						pos.x+=sceneryXRange.end-sceneryXRange.start;
					if(sceneryXRange.end<pos.x)
						pos.x-=sceneryXRange.end-sceneryXRange.start;
					tLocalPos.position = pos;

					if(animalComponent.nextMoveTime != 0){
						if(animalComponent.nextMoveTime > context.time)
							return;
						if(Math.random() <= animalComponent.turnRatio){
							tLocalRot = this.Rotate(tLocalRot);
						}
						animalComponent.nextMoveTime = 0;
					}
						
					if(animalComponent.nextPauseTryTime == 0)
						animalComponent.nextPauseTryTime = animalComponent.basePauseTryTime/context.speed+context.time;
					if(context.time > animalComponent.nextPauseTryTime){
						if(Math.random() <= animalComponent.pauseRatio){
							animalComponent.nextMoveTime = (
								reusable.RandomUtil.Range(animalComponent.basePauseDurationRange)/context.speed+context.time
							);
						}
						animalComponent.nextPauseTryTime = 0;
					}else{
						tLocalPos.position = this.GetNewPosAfterFrame(animalComponent, tLocalPos, tLocalRot);
						if(tLocalPos.position.y == GameManagerSystem.GetGroundPosY() && animalComponent.jumpHeight>0){
							ut.Tweens.TweenService.addTween(
								this.world, 
								entity,
								ut.Core2D.TransformLocalPosition.position.y,
								tLocalPos.position.y,
								tLocalPos.position.y + animalComponent.jumpHeight,
								animalComponent.jumpHeight/animalComponent.jumpSpeed,
								0,
								ut.Core2D.LoopMode.PingPongOnce, 
								ut.Tweens.TweenFunc.OutQuad,
								true
							);
						}
					}
				}
			);
		}

		Rotate(tLocalRot:ut.Core2D.TransformLocalRotation) : ut.Core2D.TransformLocalRotation{
			tLocalRot.rotation = new Quaternion().setFromAxisAngle(
				new Vector3(0, 1, 0), new Quaternion(0,0,0,1).equals(tLocalRot.rotation) ? Math.PI : 0
			);
			return tLocalRot;
		}

		GetNewPosAfterFrame(
			animalComponent:Animal, tLocalPos:ut.Core2D.TransformLocalPosition, tLocalRot:ut.Core2D.TransformLocalRotation
		) : Vector3{
			let sign = new Euler().setFromQuaternion(tLocalRot.rotation).y==0 ? 1 : -1;
			let ret = tLocalPos.position.add(new Vector3(
				sign*animalComponent.baseSpeed * this.world.getConfigData(GameContext).speed * this.scheduler.deltaTime(),
				0,
				0
			));
			return ret;
		}

		//remove
		ToStringArray(list:number[]) : string{
			let ret = "";
			for(let val of list)
				ret+=val.toFixed(8)+",";
			ret = "("+ret+")";
			return ret;
		}
	}
}
