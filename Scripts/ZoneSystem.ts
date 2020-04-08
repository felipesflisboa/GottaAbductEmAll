
namespace game {
	const BORDER_TO_MOVE_ZONE : number = 56;

	@ut.executeAfter(game.GameManagerSystem)
	export class ZoneSystem extends ut.ComponentSystem {
		
		//TODO move with priority
		OnUpdate():void {
			let context = this.world.getConfigData(GameContext);
			if(context.state == GameState.BeforeStart)
				return;
			const playerPos = this.world.getComponentData(context.player, ut.Core2D.TransformLocalPosition).position;
			let scenery = this.world.getComponentData(context.scenery, Scenery);
			this.world.forEach([ut.Entity, Zone, ut.Core2D.TransformLocalPosition],(entity, zone, tLocalPos)=>{
				if(ZoneSystem.OnZone(tLocalPos.position.x, playerPos.x)){
					if(!reusable.EntityUtil.Equals(scenery.currentZone, entity)){
						scenery.currentZone = new ut.Entity(entity.index, entity.version);
						scenery = this.RefreshCornerZone(scenery, playerPos.x);
					}
				}
			});
			const currentZonePos = this.world.getComponentData(
				scenery.currentZone, ut.Core2D.TransformLocalPosition
			).position;
			if(
				reusable.EntityUtil.Equals(scenery.leftCornerZone, scenery.currentZone) && 
				currentZonePos.x - GameConstants.ZONE_WIDTH/2 + BORDER_TO_MOVE_ZONE>playerPos.x
			){
				this.Move(scenery.rightCornerZone, currentZonePos.x);
				scenery = this.RefreshCornerZone(scenery, playerPos.x);
			}else if(
				reusable.EntityUtil.Equals(scenery.rightCornerZone, scenery.currentZone) && 
				currentZonePos.x + GameConstants.ZONE_WIDTH/2 - BORDER_TO_MOVE_ZONE<playerPos.x
			){
				this.Move(scenery.leftCornerZone, currentZonePos.x);
				scenery = this.RefreshCornerZone(scenery, playerPos.x);
			}
			this.world.setComponentData(
				new ut.Entity(context.scenery.index, context.scenery.version), scenery
			);
		}

		RefreshCornerZone(scenery : Scenery, playerX:number) : Scenery{
			scenery.leftCornerZone = new ut.Entity(0,0);
			let mostLeftPos = new Vector3(0,0,0);
			scenery.rightCornerZone = new ut.Entity(0,0);
			let mostRightPos = new Vector3(0,0,0);
			this.world.forEach([ut.Entity, Zone, ut.Core2D.TransformLocalPosition],(entity, zone, tLocalPos)=>{
				if(!reusable.EntityUtil.Equals(scenery.currentZone, entity)){
					if(tLocalPos.position.x > playerX && (scenery.rightCornerZone.isNone() || tLocalPos.position.x > mostRightPos.x)){
						scenery.rightCornerZone = new ut.Entity(entity.index, entity.version);
						mostRightPos = tLocalPos.position;
					}
					if(tLocalPos.position.x < playerX && (scenery.leftCornerZone.isNone() || tLocalPos.position.x < mostLeftPos.x)){
						scenery.leftCornerZone = new ut.Entity(entity.index, entity.version);
						mostLeftPos = tLocalPos.position;
					}
				}
			});
			if(scenery.rightCornerZone.isNone())
				scenery.rightCornerZone = scenery.currentZone;
			if(scenery.leftCornerZone.isNone())
				scenery.leftCornerZone = scenery.currentZone;
			return scenery;
		}

		Move(zone:ut.Entity, currentZoneX:number) : void {
			this.world.usingComponentData(zone, [ut.Core2D.TransformLocalPosition], (tLocalPos) => {
				const vecToAdd = new Vector3(
					(
						Math.abs(currentZoneX - tLocalPos.position.x) + GameConstants.ZONE_WIDTH
					) * reusable.GeneralUtil.Sign(currentZoneX - tLocalPos.position.x), 
				0, 0);
				tLocalPos.position = tLocalPos.position.add(vecToAdd);
			});
		}

		static OnZone(zoneX:number, x:number) : boolean{
			return (zoneX - GameConstants.ZONE_WIDTH/2 <= x) && (x <= zoneX + GameConstants.ZONE_WIDTH/2);
		}
	}
}