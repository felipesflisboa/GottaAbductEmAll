namespace game {
	@ut.executeAfter(ut.Shared.UserCodeStart)
	export class GameCanvasSystem extends ut.ComponentSystem {
		OnUpdate():void {
			const context = this.world.getConfigData(GameContext);
			if(context.state == GameState.BeforeStart)
				return;
			this.world.forEach([ut.Entity, GameCanvas],(entity, canvas) => {
				if(
					context.gameOverShowTime != 0 && 
					context.gameOverShowTime < context.time && 
					this.world.hasComponent(canvas.gameOverRect, ut.Disabled)
				){
					reusable.EntityUtil.SetActiveRecursively(this.world, canvas.gameOverRect, true);
					AudioPlayer.Play(this.world, this.world.getComponentData(context.audioManager, AudioManager).gameOverAudio);
				}
				if(this.world.hasComponent(canvas.pauseRect, ut.Disabled) == context.paused)
					reusable.EntityUtil.SetActiveRecursively(this.world, canvas.pauseRect, context.paused);
					if(!this.world.hasComponent(canvas.fadeRect, ut.Disabled))
						reusable.EntityUtil.SetActiveRecursively(this.world, canvas.fadeRect, false);
			});
		}
	}
}