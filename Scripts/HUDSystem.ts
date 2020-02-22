namespace game {
	@ut.requiredComponents(HUD)
	@ut.executeAfter(ut.Shared.UserCodeStart)
	export class HUDSystem extends ut.ComponentSystem {
		OnUpdate():void {
			const context = this.world.getConfigData(GameContext);
			if(!context.initialized)
				return;
			this.world.forEach([ut.Entity, HUD],(entity, hud) => {
				this.world.usingComponentData(hud.scoreText, [ut.Text.Text2DRenderer], (textComponent)=>{
					textComponent.text = reusable.GameUtil.ExactDigits(context.score,3);
				});
				this.world.usingComponentData(hud.topScoreText, [ut.Text.Text2DRenderer], (textComponent)=>{
					textComponent.text = reusable.GameUtil.ExactDigits(Math.max(context.score, context.topScore),3);
				});
				/*
				this.world.usingComponentData(hud.liveText, [ut.Text.Text2DRenderer], (textComponent)=>{
					textComponent.text = Math.max(
						0, this.world.getComponentData(context.player, Player).extraLiveCount + 1
					).toString();
				});
				*/
				if(
					context.gameOverShowTime != 0 && 
					context.gameOverShowTime < context.time && 
					this.world.hasComponent(hud.gameOverRect, ut.Disabled)
				){
					this.world.removeComponent(hud.gameOverRect, ut.Disabled);
					AudioPlayer.Play(
						this.world,this.world.getComponentData(context.audioManager, AudioManager).gameOverAudio
					);
				}
			});
			this.world.forEach([ut.Entity, HUDHeart],(entity, heart) => {
				let shouldBeActive = heart.index <= this.world.getComponentData(context.player, Player).extraLiveCount;
				if(shouldBeActive == this.world.hasComponent(heart.image, ut.Disabled))
					reusable.GameUtil.ToggleActive(this.world, heart.image);
			});
		}
	}
}
