import * as core from '@actions/core'
import FormData from 'form-data'
import {baseURL} from './util'
import {resolve} from 'path'
import {createReadStream} from 'fs'
import axios, {isAxiosError} from 'axios'
import {
  CreatedVersionDetails,
  InitialUploadDetails,
  UploadDetails
} from './types.d'

function throwAxiosError(operation: string, error: unknown): never {
  if (isAxiosError(error)) {
    const status = error.response?.status
    const statusText = error.response?.statusText
    const requestUrl = error.config?.url ?? 'unknown-url'
    const statusDetails = status
      ? `status=${status}${statusText ? ` ${statusText}` : ''}`
      : 'no-status'

    core.error(`${operation} failed (${statusDetails}) at ${requestUrl}`)

    if (error.response?.data !== undefined) {
      core.error(
        `${operation} error response: ${JSON.stringify(error.response.data)}`
      )
    } else {
      core.error(`${operation} error message: ${error.message}`)
    }
  } else {
    core.error(`${operation} failed: ${String(error)}`)
  }

  throw error
}

export async function createUpload(
  xpiPath: string,
  token: string
): Promise<InitialUploadDetails> {
  const url = `${baseURL}/addons/upload/`
  const body = new FormData()

  core.debug(`Uploading ${xpiPath}`)
  body.append('upload', createReadStream(resolve(xpiPath)))
  body.append('channel', 'listed')

  try {
    const response = await axios.post(url, body, {
      headers: {
        ...body.getHeaders(),
        Authorization: `JWT ${token}`
      }
    })
    core.debug(`Create upload response: ${JSON.stringify(response.data)}`)
    return response.data
  } catch (error) {
    throwAxiosError('Create upload request', error)
  }
}

export async function tryUpdateExtension(
  guid: string,
  uuid: string,
  token: string,
  approvalNotes?: string,
  releaseNotes?: string,
  srcPath?: string
): Promise<boolean> {
  const details = await getUploadDetails(uuid, token)
  if (!details.processed) {
    return false
  }

  if (!details.valid) {
    throw new Error('Extension validation failed')
  }

  const versionDetails = await createVersion(
    guid,
    uuid,
    token,
    approvalNotes,
    releaseNotes
  )

  if (srcPath) {
    await uploadSource(guid, versionDetails.id, srcPath, token)
  }

  return true
}

export async function createVersion(
  guid: string,
  uuid: string,
  token: string,
  approvalNotes?: string,
  releaseNotes?: string
): Promise<CreatedVersionDetails> {
  const url = `${baseURL}/addons/addon/${guid}/versions/`
  const body: {
    upload: string
    approval_notes?: string
    release_notes?: {[locale: string]: string}
  } = {
    upload: uuid
  }

  if (approvalNotes) {
    body.approval_notes = approvalNotes
  }

  if (releaseNotes) {
    body.release_notes = {
      'en-US': releaseNotes
    }
  }

  core.debug(`Creating version for extension ${guid} with ${uuid}`)
  try {
    const response = await axios.post(url, body, {
      headers: {
        Authorization: `JWT ${token}`,
        'Content-Type': 'application/json'
      }
    })
    core.debug(`Create version response: ${JSON.stringify(response.data)}`)
    return response.data
  } catch (error) {
    throwAxiosError('Create version request', error)
  }
}

export async function uploadSource(
  guid: string,
  versionId: number,
  srcPath: string,
  token: string
): Promise<void> {
  const url = `${baseURL}/addons/addon/${guid}/versions/${versionId}/`
  const body = new FormData()

  core.debug(`Uploading ${srcPath}`)
  body.append('source', createReadStream(resolve(srcPath)))

  try {
    const response = await axios.patch(url, body, {
      headers: {
        ...body.getHeaders(),
        Authorization: `JWT ${token}`
      }
    })
    core.debug(`Upload source response: ${JSON.stringify(response.data)}`)
  } catch (error) {
    throwAxiosError('Upload source request', error)
  }
}

export async function getUploadDetails(
  uuid: string,
  token: string
): Promise<UploadDetails> {
  const url = `${baseURL}/addons/upload/${uuid}/`
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `JWT ${token}`
      }
    })
    core.debug(
      `Get upload details probe response: ${JSON.stringify(response.data)}`
    )
    return response.data
  } catch (error) {
    throwAxiosError('Get upload details request', error)
  }
}
