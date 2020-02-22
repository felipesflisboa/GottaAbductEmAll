namespace game {
	export class AudioPlayer {
		/**
		 * Play only one per time
		**/
		public static Play(world:ut.World, audioEntity:ut.Entity):void {
			const context = world.getConfigData(GameContext);
			let audioManagerComponent = world.getComponentData(context.audioManager, AudioManager);
			if(audioManagerComponent.mute)
				return;
			if(
				audioManagerComponent.lastPlayedAudio.index != audioEntity.index || 
				audioManagerComponent.lastPlayedAudio.version != audioEntity.version
			){    
				AudioPlayer.Stop(world, audioManagerComponent);
			}
			audioManagerComponent.lastPlayedAudio = audioEntity;
			world.getOrAddComponentData(audioManagerComponent.lastPlayedAudio, ut.Audio.AudioSourceStart);
			world.setComponentData(context.audioManager, audioManagerComponent);
		}

		public static Stop(world:ut.World, audioManagerComponent?:AudioManager) : void{
			if(audioManagerComponent==null){
				audioManagerComponent = world.getComponentData(
					world.getConfigData(GameContext).audioManager, AudioManager
				);
			}
			if(!audioManagerComponent.lastPlayedAudio.isNone())
				world.getOrAddComponentData(audioManagerComponent.lastPlayedAudio, ut.Audio.AudioSourceStop);
		}
	}
}
