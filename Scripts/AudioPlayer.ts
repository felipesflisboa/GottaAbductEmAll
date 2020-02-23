namespace game {
	export class AudioPlayer {
		/**
		 * Play only one per time
		**/
		public static Play(world:ut.World, audioEntity:ut.Entity):void {
			const context = world.getConfigData(GameContext);
			let audioManager = world.getComponentData(context.audioManager, AudioManager);
			if(audioManager.mute)
				return;
			if(!reusable.GeneralUtil.EntityEquals(audioManager.lastPlayedAudio, audioEntity))   
				AudioPlayer.Stop(world, audioManager);
			audioManager.lastPlayedAudio = audioEntity;
			world.getOrAddComponentData(audioManager.lastPlayedAudio, ut.Audio.AudioSourceStart);
			world.setComponentData(context.audioManager, audioManager);
		}

		public static Stop(world:ut.World, audioManager?:AudioManager) : void{
			if(audioManager==null)
				audioManager = world.getComponentData(world.getConfigData(GameContext).audioManager, AudioManager);
			if(!audioManager.lastPlayedAudio.isNone())
				world.getOrAddComponentData(audioManager.lastPlayedAudio, ut.Audio.AudioSourceStop);
		}
	}
}
