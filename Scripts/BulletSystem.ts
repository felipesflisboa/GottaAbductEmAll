
namespace game {
	const BULLET_BASE_SPEED : number = 10;
	const BULLET_MAX_X_DISTANCE_TO_PLAYER : number = 56;

	@ut.requiredComponents(Bullet)
	@ut.executeAfter(ut.Shared.UserCodeStart)
	export class BulletSystem extends ut.ComponentSystem {
		OnUpdate():void {
			const context = this.world.getConfigData(GameContext);
			if(context.state == GameState.BeforeStart)
				return;
			let playerPos = this.world.getComponentData(context.player, ut.Core2D.TransformLocalPosition).position; 
			this.world.forEach([ut.Entity, Bullet, ut.Core2D.TransformLocalPosition], (entity, bullet, tLocalPos) => {
				tLocalPos.position = this.GetNewPosAfterFrame(bullet, tLocalPos.position);
				if(Math.abs(tLocalPos.position.x - playerPos.x) > BULLET_MAX_X_DISTANCE_TO_PLAYER){
					ut.Core2D.TransformService.destroyTree(this.world, entity, true);
				}
			});
		}

		GetNewPosAfterFrame(bullet:Bullet, pos:Vector3) : Vector3{
			return reusable.VectorUtil.V2To3(reusable.VectorUtil.V3To2(pos).add(bullet.direction.multiplyScalar(
				this.scheduler.deltaTime() * this.world.getConfigData(GameContext).speed * BULLET_BASE_SPEED
			)));
		}
	}
}