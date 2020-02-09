
namespace reusable {
    /**
     * General rect util class.
    **/
    export class RectUtil{
        static Center(rect:ut.Math.Rect) : Vector2{
            return new Vector2(rect.x+rect.width/2, rect.y+rect.height/2);
        }

        static Max(rect:ut.Math.Rect) : Vector2{
            return new Vector2(rect.x+rect.width, rect.y+rect.height);
        }

        //TODO move into collider
        static GetRect(boxCollider: ut.Physics2D.BoxCollider2D) : ut.Math.Rect{
            return new ut.Math.Rect(
                -boxCollider.pivot.x*boxCollider.size.x,
                -boxCollider.pivot.y*boxCollider.size.y,
                boxCollider.size.x,
                boxCollider.size.y
            );
        }

        static GetLocalRect(
            boxCollider: ut.Physics2D.BoxCollider2D,
            tLocalPos: ut.Core2D.TransformLocalPosition,
            tLocalScale: ut.Core2D.TransformLocalScale
        ) : ut.Math.Rect{
            let scaledSize = boxCollider.size.multiply(new Vector2(tLocalScale.scale.x, tLocalScale.scale.y));
            return new ut.Math.Rect(
                tLocalPos.position.x-boxCollider.pivot.x*scaledSize.x,
                tLocalPos.position.y-boxCollider.pivot.y*scaledSize.y,
                scaledSize.x,
                scaledSize.y
            );
        }

        static IsOn(rect:ut.Math.Rect, pos:Vector2|Vector3) : boolean{
            return rect.x<pos.x && pos.x<RectUtil.Max(rect).x && rect.y<pos.y && pos.y<RectUtil.Max(rect).y;
        }
    }
}
