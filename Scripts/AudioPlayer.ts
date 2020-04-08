namespace game {
	export class AudioPlayer {
		/**
		 * Play only one per time
		**/
		public static Play(world:ut.World, audioEntity:ut.Entity):void {
			const context = world.getConfigData(GameContext);
			world.usingComponentData(context.audioManager, [AudioManager], (audioManager) => {
				if(audioManager.mute)
					return;
				if(!reusable.EntityUtil.Equals(audioManager.lastPlayedAudio, audioEntity))   
					AudioPlayer.Stop(world, audioManager);
				audioManager.lastPlayedAudio = audioEntity;
				world.getOrAddComponentData(audioManager.lastPlayedAudio, ut.Audio.AudioSourceStart);
			});
		}

		public static Stop(world:ut.World, audioManager?:AudioManager) : void{
			if(audioManager==null)
				audioManager = world.getComponentData(world.getConfigData(GameContext).audioManager, AudioManager);
			if(!audioManager.lastPlayedAudio.isNone())
				world.getOrAddComponentData(audioManager.lastPlayedAudio, ut.Audio.AudioSourceStop);
		}
	}
}
