
namespace game {
    const SCORE_KEY : string = "AbductTopScore";
    
	/**
	 * Game specific utils
	**/
	export class AbductUtil{
		static GetSceneryXRange(world: ut.World, scenery:Scenery): ut.Math.Range{
			return new ut.Math.Range(
				world.getComponentData(scenery.leftCornerZone,ut.Core2D.TransformLocalPosition).position.x - GameConstants.ZONE_WIDTH/2,
				world.getComponentData(scenery.rightCornerZone,ut.Core2D.TransformLocalPosition).position.x + GameConstants.ZONE_WIDTH/2,
			);
		}

		static IsTractorBeamActive(world:ut.World, player?:Player) : boolean {
			if(player == null)
				player = world.getComponentData(world.getConfigData(GameContext).player, Player);
			return !world.hasComponent(player.tractorBeam, ut.Disabled);
		}

		static GetMainCamEntity(world:ut.World) : ut.Entity{
			//TODO put on fixed entity
			let ret = null;
			world.forEach( [ut.Entity, ut.Core2D.Camera2D],(entity, camera)=>{
				if(camera.depth < 0){
					ret = new ut.Entity(entity.index, entity.version);
					return;
				}
			});
			return ret;
		}

		static IsTitle(world:ut.World) : boolean {
			let ret = true;
			world.forEach( [Scenery],(scenery) => ret = false);
			return ret;
		}

		static AddPoints(world:ut.World, points:number) : void {
			let context = world.getConfigData(GameContext);
			context.score+=points;
			if(context.score >= context.usedLevelInfoArray.length)
				context.speed = context.usedLevelInfoArray[context.usedLevelInfoArray.length - 1].speed;
			else
				context.speed = context.usedLevelInfoArray[context.score].speed;
		  world.setConfigData(context);
		}

		static HasAnyInputDown() : boolean {
			return ut.Runtime.Input.getMouseButton(0) || ut.Runtime.Input.touchCount() > 0 || reusable.GeneralUtil.GetKeyDown([
				ut.Core2D.KeyCode.C,
				ut.Core2D.KeyCode.P,
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
			return +reusable.PersistenceUtil.GetCookie(SCORE_KEY);
		}

		static SaveTopScore(value:number) : void{
			reusable.PersistenceUtil.SetCookie(SCORE_KEY, value.toString());
		}

		static GetTimeFormatted(context : GameContext): string{
			return Math.floor(context.time/60)+":"+reusable.GeneralUtil.ExactDigits( Math.floor(context.time) % 60 ,2)
		}
  }
}
