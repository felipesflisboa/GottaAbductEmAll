
namespace reusable {
	/**
	 * Make a component with SpriteFlasher to flash on certain time intervals 
	**/
	@ut.requiredComponents(game.SpriteFlasher)
	export class SpriteFlasherSystem extends ut.ComponentSystem {
		OnUpdate():void {
			this.world.forEach([game.SpriteFlasher, ut.Core2D.Sprite2DRenderer], (spriteFlasher, sprite) => {
				if(spriteFlasher.originalAlpha ==0)
				spriteFlasher.originalAlpha = sprite.color.a;
				if(spriteFlasher.enabled != spriteFlasher.lastFrameEnabled){
					if(spriteFlasher.enabled){
						spriteFlasher.nextChangeRemainingTime = spriteFlasher.duration/2;
						sprite.color = new ut.Core2D.Color(sprite.color.r, sprite.color.g, sprite.color.b, 0);
					}else{
						sprite.color = new ut.Core2D.Color(
							sprite.color.r, sprite.color.g, sprite.color.b, spriteFlasher.originalAlpha
						);
					}
					spriteFlasher.lastFrameEnabled = spriteFlasher.enabled;
				}
				if(!spriteFlasher.enabled)
					return;
				if(spriteFlasher.nextChangeRemainingTime<=0){
					sprite.color = new ut.Core2D.Color(
						sprite.color.r, 
						sprite.color.g, 
						sprite.color.b, 
						sprite.color.a==0 ? spriteFlasher.originalAlpha : 0
					);
					spriteFlasher.nextChangeRemainingTime += spriteFlasher.duration/2;
				}
				spriteFlasher.nextChangeRemainingTime -= this.scheduler.deltaTime();
			});
		}
	}
}
