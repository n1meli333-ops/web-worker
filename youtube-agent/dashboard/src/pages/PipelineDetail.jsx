import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Circle, Loader } from 'lucide-react';
import api from '../api/client';

const STEPS = [
  { key: 'GENERATING_IDEA', label: 'Idea Generation' },
  { key: 'WRITING_STORY', label: 'Story Writing' },
  { key: 'GENERATING_VOICE', label: 'Voiceover' },
  { key: 'EXTRACTING_TIMESTAMPS', label: 'Timestamps' },
  { key: 'GENERATING_VIDEO_PROMPTS', label: 'Video Prompts' },
  { key: 'GENERATING_VIDEOS', label: 'Video Generation' },
  { key: 'ASSEMBLING_VIDEO', label: 'Assembly' },
  { key: 'GENERATING_THUMBNAIL', label: 'Thumbnail' },
  { key: 'PUBLISHING', label: 'Publishing' },
  { key: 'COMPLETED', label: 'Done' },
];

function getStepStatus(pipelineStatus, stepKey) {
  const statusIndex = STEPS.findIndex(s => s.key === pipelineStatus);
  const stepIndex = STEPS.findIndex(s => s.key === stepKey);
  if (stepIndex < statusIndex) return 'completed';
  if (stepIndex === statusIndex) return 'active';
  return 'pending';
}

export default function PipelineDetail() {
  const { id } = useParams();
  const [pipeline, setPipeline] = useState(null);

  useEffect(() => {
    const load = () => api.get(`/pipelines/${id}`).then(res => setPipeline(res.data));
    load();
    const interval = setInterval(load, 5000); // Auto-refresh
    return () => clearInterval(interval);
  }, [id]);

  if (!pipeline) return <div className="text-gray-400">Loading...</div>;

  return (
    <div>
      <Link to="/pipelines" className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-4">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{pipeline.storyTitle || `Pipeline ${id.substring(0, 8)}`}</h1>
        <p className="text-gray-400">{pipeline.channel?.name} | Created {new Date(pipeline.createdAt).toLocaleString()}</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-dark-50 rounded-xl p-6 border border-dark-400 mb-6">
        <h2 className="font-semibold mb-4">Progress</h2>
        <div className="space-y-3">
          {STEPS.map(step => {
            const status = pipeline.status === 'FAILED' ? 'failed' : getStepStatus(pipeline.status, step.key);
            return (
              <div key={step.key} className="flex items-center gap-3">
                {status === 'completed' && <CheckCircle size={18} className="text-success" />}
                {status === 'active' && <Loader size={18} className="text-accent-light animate-spin" />}
                {status === 'pending' && <Circle size={18} className="text-gray-600" />}
                {status === 'failed' && <Circle size={18} className="text-danger" />}
                <span className={
                  status === 'completed' ? 'text-success' :
                  status === 'active' ? 'text-accent-light font-medium' :
                  'text-gray-600'
                }>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        {pipeline.error && (
          <div className="mt-4 bg-danger/10 border border-danger/30 rounded-lg p-3 text-sm text-danger">
            {pipeline.error}
          </div>
        )}
      </div>

      {/* Data Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pipeline.idea && (
          <div className="bg-dark-50 rounded-xl p-5 border border-dark-400">
            <h3 className="font-semibold mb-2">Idea</h3>
            <pre className="text-sm text-gray-300 whitespace-pre-wrap">{
              typeof pipeline.idea === 'string' ? pipeline.idea : JSON.stringify(pipeline.idea, null, 2)
            }</pre>
          </div>
        )}
        {pipeline.story && (
          <div className="bg-dark-50 rounded-xl p-5 border border-dark-400 max-h-96 overflow-auto">
            <h3 className="font-semibold mb-2">Story</h3>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">{pipeline.story.substring(0, 2000)}{pipeline.story.length > 2000 ? '...' : ''}</p>
          </div>
        )}
        {pipeline.videoTitle && (
          <div className="bg-dark-50 rounded-xl p-5 border border-dark-400">
            <h3 className="font-semibold mb-2">Video Metadata</h3>
            <p className="text-sm"><span className="text-gray-400">Title:</span> {pipeline.videoTitle}</p>
            <p className="text-sm mt-2"><span className="text-gray-400">Tags:</span> {pipeline.videoTags?.join(', ')}</p>
            {pipeline.videoDescription && (
              <p className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">{pipeline.videoDescription.substring(0, 500)}</p>
            )}
          </div>
        )}
        {pipeline.video?.youtubeUrl && (
          <div className="bg-dark-50 rounded-xl p-5 border border-dark-400">
            <h3 className="font-semibold mb-2">Published</h3>
            <a href={pipeline.video.youtubeUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-light">
              {pipeline.video.youtubeUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
