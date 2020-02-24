
namespace game {
	const BULLET_MAX_X_DISTANCE_TO_PLAYER : number = 56;

	@ut.requiredComponents(Bullet)
	@ut.executeAfter(ut.Shared.UserCodeStart)
	export class BulletSystem extends ut.ComponentSystem {
		OnUpdate():void {
			const context = this.world.getConfigData(GameContext);
			if(context.state == GameState.BeforeStart)
				return;
			let playerPos = this.world.getComponentData(context.player, ut.Core2D.TransformLocalPosition).position; 
			//TODO break in method
			this.world.forEach([ut.Entity, Bullet, ut.Core2D.TransformLocalPosition], (entity, bullet, tLocalPosition) => {
				if(Math.abs(tLocalPosition.position.x - playerPos.x) > BULLET_MAX_X_DISTANCE_TO_PLAYER)
					ut.Core2D.TransformService.destroyTree(this.world, entity, true);
			});
		}
	}
}