
namespace game {
	const X_LIMIT : number = 48;

	export class BackgroundShipSystem extends ut.ComponentSystem {
		OnUpdate():void {
			this.world.forEach([ut.Entity, game.BackgroundShip, ut.Core2D.TransformLocalPosition], (entity, ship, tLocalPos) => {
				if(ship.speed==0)
					this.Initialize(entity, tLocalPos);
				const changePosition = ship.way ? tLocalPos.position.x > X_LIMIT : tLocalPos.position.x < -X_LIMIT;
				if(changePosition){
					ship.way = tLocalPos.position.x < 0;
					tLocalPos.position = new Vector3(
						reusable.RandomUtil.Range(X_LIMIT, 120)*(ship.way ? -1 : 1),
						tLocalPos.position.y,
						tLocalPos.position.z
					);
					ship.speed = reusable.RandomUtil.Range(12, 60);
				}
				tLocalPos.position = tLocalPos.position.add(new Vector3(ship.speed*(ship.way ? 1 : -1)*this.scheduler.deltaTime(), 0, 0));
			});
		}

		Initialize(entity:ut.Entity, tLocalPos:ut.Core2D.TransformLocalPosition):void{
			ut.Tweens.TweenService.addTween(
				this.world, 
				entity,
				ut.Core2D.TransformLocalPosition.position.y,
				tLocalPos.position.y,
				tLocalPos.position.y + 2,
				0.4,
				0,
				ut.Core2D.LoopMode.PingPong, 
				ut.Tweens.TweenFunc.InOutQuad,
				false
			);
		}
	}
}
