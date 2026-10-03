import { Link } from 'react-router';
import { Avatar } from './Avatar.jsx';
import { CommentIcon, ArrowRightIcon } from './Icons.jsx';
import { entryLabel, excerpt, formatDate, plural } from '../lib/format.js';
import styles from './PostPreview.module.css';

function Meta({ post, size }) {
  return (
    <div className={styles.meta}>
      <span className={styles.author}>
        <Avatar person={post.author} size={size} />
        <span>{post.author.displayName}</span>
      </span>
      <time className={styles.date} dateTime={post.createdAt}>
        {formatDate(post.createdAt)}
      </time>
      <span className={styles.comments}>
        <CommentIcon width={15} height={15} />
        {plural(post.commentCount, 'comment')}
      </span>
    </div>
  );
}

export function FeaturedPost({ post }) {
  const href = `/posts/${post.id}`;
  return (
    <article className={styles.featured} aria-labelledby={`post-title-${post.id}`}>
      <div className={styles.margin} aria-hidden="true">
        <span className={styles.numeral}>{String(post.entryNumber).padStart(2, '0')}</span>
      </div>
      <div className={styles.featuredBody}>
        <p className={styles.kicker}>
          <span className="visually-hidden">{entryLabel(post.entryNumber)}, </span>
          <span className={styles.latest}>Newest entry</span>
        </p>
        <h2 id={`post-title-${post.id}`} className={styles.featuredTitle}>
          <Link to={href} className={styles.titleLink}>
            {post.title}
          </Link>
        </h2>
        <p className={styles.featuredExcerpt}>{excerpt(post.description, 300)}</p>
        <Meta post={post} size="md" />
        <Link to={href} className={styles.read} aria-label={`Read the note: ${post.title}`}>
          Read the note
          <ArrowRightIcon />
        </Link>
      </div>
    </article>
  );
}

export function EntryPost({ post, headingLevel = 3 }) {
  const Heading = `h${headingLevel}`;
  const href = `/posts/${post.id}`;
  return (
    <article className={styles.entry} aria-labelledby={`post-title-${post.id}`}>
      <p className="mono-label">{entryLabel(post.entryNumber)}</p>
      <Heading id={`post-title-${post.id}`} className={styles.entryTitle}>
        <Link to={href} className={styles.titleLink}>
          {post.title}
        </Link>
      </Heading>
      <p className={styles.entryExcerpt}>{excerpt(post.description, 150)}</p>
      <Meta post={post} size="sm" />
      <Link to={href} className={styles.read} aria-label={`Read the note: ${post.title}`}>
        Read note
        <ArrowRightIcon width={16} height={16} />
      </Link>
    </article>
  );
}
