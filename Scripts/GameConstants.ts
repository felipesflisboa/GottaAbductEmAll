
namespace game {
	/**
	 * Global consts
	**/
	export class GameConstants{
		public static readonly SCREEN_SIZE : Vector2 = new Vector2(84, 48);
		public static readonly GROUND_POS_Y : number = -20;
		public static readonly Y_MOVEMENT_RANGE : ut.Math.Range = new ut.Math.Range(-3, 14);
		public static readonly ZONE_WIDTH : number = 256;
		public static readonly ANIMAL_DESPAWN_MIN_DISTANCE : number = 112;
		public static readonly PLAYER_INITIAL_EXTRA_LIVE_COUNT : number = 3;
		public static readonly PLAYER_EXTRA_LIVE_LIMIT : number = 3;
	}
}